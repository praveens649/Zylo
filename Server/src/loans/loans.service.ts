import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { listMeta, pageParams } from '../common/pagination.js';
import type { UserModel } from '../generated/prisma/models.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  DAY_MS,
  istDateKey,
  istMonthStart,
  istShortDate,
  isUniqueViolation,
  LOAN_DUE_DAYS,
  LOAN_LIMIT_MB,
  LOAN_MAX_PER_MONTH,
  LOAN_MIN_MB,
  LOAN_STEP_MB,
  loanRefs,
  notify,
  OPEN_LOAN_STATUSES,
  type Tx,
} from './loan-rules.js';
import type {
  BorrowLoanDto,
  ListAdminLoansQueryDto,
} from './dto.js';

/** Anything that can run the Prisma calls below — PrismaService or a tx. */
type Db = PrismaService | Prisma.TransactionClient;

type Eligibility =
  | {
      ok: true;
      sim: { id: string; status: string };
      plan: { id: string; dailyDataAllowanceMb: number | null };
    }
  | { ok: false; status: number; code: string; message: string };

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // Eligibility (shared by GET /loans/eligibility and POST /loans)
  // -----------------------------------------------------------------------

  /**
   * Runs every business rule from the loan spec against the SIM. All queries
   * are flat so they work inside a transaction and in tests alike.
   *
   * Plan gate: `dataLoanEnabled` is not modeled in the schema, so Data
   * Bank–enabled plans carry the loan feature (the two always ship together).
   */
  private async evaluate(
    db: Db,
    simId: string,
    user: { id: string; isActive?: boolean },
    now: Date,
  ): Promise<Eligibility> {
    if (user.isActive === false) {
      return {
        ok: false,
        status: 409,
        code: 'ACCOUNT_INACTIVE',
        message: 'Your account is not active. Please contact support.',
      };
    }

    // Only the owner's own SIM — anything else is simply "not found".
    const sim = await db.sim.findFirst({
      where: { id: simId, userId: user.id },
    });
    if (!sim) {
      return {
        ok: false,
        status: 404,
        code: 'SIM_NOT_FOUND',
        message: 'SIM not found.',
      };
    }
    if (sim.status !== 'ACTIVE') {
      return {
        ok: false,
        status: 409,
        code: 'SIM_NOT_ACTIVE',
        message: 'This SIM is not active.',
      };
    }

    const subscription = await db.planSubscription.findFirst({
      where: {
        simId,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gt: now },
      },
      orderBy: { startDate: 'desc' },
    });
    if (!subscription) {
      return {
        ok: false,
        status: 409,
        code: 'NO_ACTIVE_PLAN',
        message: 'This SIM has no active plan. Please recharge first.',
      };
    }

    const plan = await db.plan.findUnique({
      where: { id: subscription.planId },
    });
    if (!plan?.dataBankEnabled) {
      return {
        ok: false,
        status: 409,
        code: 'PLAN_NOT_ELIGIBLE',
        message: 'Your plan does not include Zylo Data Loan.',
      };
    }

    const openLoan = await db.dataLoan.findFirst({
      where: { simId, status: { in: OPEN_LOAN_STATUSES } },
    });
    if (openLoan) {
      return {
        ok: false,
        status: 409,
        code: 'OPEN_LOAN_EXISTS',
        message: 'You already have an open loan on this number.',
      };
    }

    const monthCount = await db.dataLoan.count({
      where: {
        simId,
        borrowedAt: { gte: istMonthStart(now) },
        status: { not: 'CANCELLED' },
      },
    });
    if (monthCount >= LOAN_MAX_PER_MONTH) {
      return {
        ok: false,
        status: 409,
        code: 'MONTHLY_LIMIT_REACHED',
        message: `You can borrow at most ${LOAN_MAX_PER_MONTH} times a month on this number.`,
      };
    }

    return { ok: true, sim, plan };
  }

  /** Public eligibility probe used by the Borrow UI. */
  async getEligibility(simId: string, user: UserModel, now = new Date()) {
    const result = await this.evaluate(this.prisma, simId, user, now);
    if (!result.ok && result.code === 'SIM_NOT_FOUND') {
      throw new ApiException(404, result.code, result.message);
    }
    return {
      eligible: result.ok,
      ...(!result.ok
        ? { code: result.code, message: result.message }
        : {}),
      maxMb: LOAN_LIMIT_MB,
      dueDays: LOAN_DUE_DAYS,
    };
  }

  // -----------------------------------------------------------------------
  // Borrow (POST /loans)
  // -----------------------------------------------------------------------

  /**
   * One transaction: lock the SIM row so concurrent borrows serialize, replay
   * by deterministic issue reference, re-check every rule, then write the
   * loan + LOAN_ISSUED ledger entry + notification together.
   *
   * Idempotency rides on `DataLoanTransaction.reference` (@unique) since the
   * schema has no loan-level idempotency column.
   */
  async borrow(
    user: UserModel,
    dto: BorrowLoanDto,
    idempotencyKey: string | undefined,
    now = new Date(),
  ) {
    if (!idempotencyKey?.trim()) {
      throw new ApiException(
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'The Idempotency-Key header is required to borrow data.',
      );
    }
    const key = idempotencyKey.trim();
    const reference = loanRefs.issue(dto.simId, key);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Serialize borrows for this SIM — the row lock is the one-open-loan
        // guard in place of a partial unique index (schema is fixed).
        await tx.$queryRaw`SELECT id FROM "Sim" WHERE id = ${dto.simId} FOR UPDATE`;

        const replay = await tx.dataLoanTransaction.findFirst({
          where: { reference },
        });
        if (replay) {
          return tx.dataLoan.findUnique({ where: { id: replay.loanId } });
        }

        const eligibility = await this.evaluate(tx, dto.simId, user, now);
        if (!eligibility.ok) {
          throw new ApiException(
            eligibility.status,
            eligibility.code,
            eligibility.message,
          );
        }

        if (
          !Number.isInteger(dto.amountMb) ||
          dto.amountMb < LOAN_MIN_MB ||
          dto.amountMb % LOAN_STEP_MB !== 0
        ) {
          throw new ApiException(
            409,
            'AMOUNT_INVALID',
            `Borrow in steps of ${LOAN_STEP_MB} MB (minimum ${LOAN_MIN_MB} MB).`,
          );
        }
        if (dto.amountMb > LOAN_LIMIT_MB) {
          throw new ApiException(
            409,
            'AMOUNT_TOO_HIGH',
            `You can borrow up to ${LOAN_LIMIT_MB} MB at a time.`,
          );
        }

        const dueAt = new Date(now.getTime() + LOAN_DUE_DAYS * DAY_MS);
        const loan = await tx.dataLoan.create({
          data: {
            userId: user.id,
            simId: dto.simId,
            originalAmountMb: dto.amountMb,
            outstandingAmountMb: dto.amountMb,
            status: 'ACTIVE',
            borrowedAt: now,
            dueAt,
          },
        });
        await tx.dataLoanTransaction.create({
          data: {
            loanId: loan.id,
            type: 'LOAN_ISSUED',
            amountMb: dto.amountMb,
            balanceAfterMb: dto.amountMb,
            reference,
            description: 'Data Loan issued',
          },
        });

        // Credit the borrowed MB into today's usable pool — the loan is the
        // debt ledger; the data itself behaves like ordinary daily data.
        // Usage simulation, remaining-data display and "unused → bank →
        // repay" all work on DailyDataUsage.allowanceMb automatically.
        const cycleDate = new Date(`${istDateKey(now)}T00:00:00.000Z`);
        await tx.dailyDataUsage.upsert({
          where: { simId_cycleDate: { simId: dto.simId, cycleDate } },
          create: {
            simId: dto.simId,
            planId: eligibility.plan.id,
            cycleDate,
            allowanceMb:
              (eligibility.plan.dailyDataAllowanceMb ?? 0) + dto.amountMb,
          },
          update: { allowanceMb: { increment: dto.amountMb } },
        });

        await notify(
          tx,
          user.id,
          'Data Loan approved',
          `${dto.amountMb} MB added to today's data. Pay back by ${istShortDate(dueAt)}.`,
        );
        return loan;
      });
    } catch (err) {
      // A same-key request won the race — return the loan it created.
      if (isUniqueViolation(err)) {
        const replay = await this.prisma.dataLoanTransaction.findFirst({
          where: { reference },
        });
        if (replay) {
          return this.prisma.dataLoan.findUnique({
            where: { id: replay.loanId },
          });
        }
        throw new ApiException(
          409,
          'OPEN_LOAN_EXISTS',
          'You already have an open loan on this number.',
        );
      }
      throw err;
    }
  }

  // -----------------------------------------------------------------------
  // Customer reads — always scoped to the caller's own SIM
  // -----------------------------------------------------------------------

  private async assertOwnSim(simId: string, userId: string) {
    const sim = await this.prisma.sim.findFirst({
      where: { id: simId, userId },
    });
    if (!sim) {
      throw new ApiException(404, 'SIM_NOT_FOUND', 'SIM not found.');
    }
    return sim;
  }

  /** Open loan for the SIM, or null. */
  async getActive(simId: string, userId: string) {
    await this.assertOwnSim(simId, userId);
    const loan = await this.prisma.dataLoan.findFirst({
      where: { simId, status: { in: OPEN_LOAN_STATUSES } },
    });
    if (!loan) return null;
    return this.withTransactions(loan);
  }

  /** Full history for the SIM, newest loan first; transactions newest first. */
  async listForSim(simId: string, userId: string) {
    await this.assertOwnSim(simId, userId);
    const loans = await this.prisma.dataLoan.findMany({
      where: { simId, userId },
    });
    loans.sort(
      (a, b) => b.borrowedAt.getTime() - a.borrowedAt.getTime(),
    );
    const transactions = await this.prisma.dataLoanTransaction.findMany({
      where: { loanId: { in: loans.map((l) => l.id) } },
    });
    const byLoan = new Map<string, typeof transactions>();
    for (const txn of transactions) {
      const list = byLoan.get(txn.loanId) ?? [];
      list.push(txn);
      byLoan.set(txn.loanId, list);
    }
    for (const list of byLoan.values()) {
      list.sort((a, b) => b.processedAt.getTime() - a.processedAt.getTime());
    }
    return loans.map((loan) => ({
      ...loan,
      repaidAmountMb: loan.originalAmountMb - loan.outstandingAmountMb,
      transactions: byLoan.get(loan.id) ?? [],
    }));
  }

  private async withTransactions(loan: { id: string } & Record<string, unknown>) {
    const transactions = await this.prisma.dataLoanTransaction.findMany({
      where: { loanId: loan.id },
    });
    transactions.sort(
      (a, b) => b.processedAt.getTime() - a.processedAt.getTime(),
    );
    return { ...loan, transactions };
  }

  // -----------------------------------------------------------------------
  // 6.2 — Repay from a new Data Bank deposit (called inside the deposit tx)
  // -----------------------------------------------------------------------

  /**
   * After a DEPOSIT credits `depositMb` to the SIM's Data Bank, up to that
   * much flows straight back out to an open loan. Returns the repaid amount
   * (0 when there is no open loan). No circular import: the Data Bank rows
   * are written through `tx` directly.
   */
  async repayFromDeposit(
    tx: Tx,
    simId: string,
    depositMb: number,
    depositTxnId: string,
    now = new Date(),
  ): Promise<{ repaidMb: number; outstandingMb: number }> {
    const loan = await tx.dataLoan.findFirst({
      where: { simId, status: { in: OPEN_LOAN_STATUSES } },
    });
    if (!loan) return { repaidMb: 0, outstandingMb: 0 };

    await tx.$queryRaw`SELECT id FROM "DataLoan" WHERE id = ${loan.id} FOR UPDATE`;

    const account = await tx.dataBankAccount.findUnique({
      where: { simId },
    });
    const repaidMb = Math.min(
      depositMb,
      loan.outstandingAmountMb,
      account?.balanceMb ?? 0,
    );
    if (repaidMb <= 0 || !account) {
      return { repaidMb: 0, outstandingMb: loan.outstandingAmountMb };
    }

    const outstanding = loan.outstandingAmountMb - repaidMb;
    const status =
      outstanding === 0
        ? 'REPAID'
        : loan.dueAt && loan.dueAt < now
          ? 'DUE'
          : 'PARTIALLY_REPAID';

    await tx.dataBankTransaction.create({
      data: {
        dataBankId: account.id,
        type: 'ADJUSTMENT',
        amountMb: repaidMb,
        balanceAfterMb: account.balanceMb - repaidMb,
        description: 'Data Loan repayment',
        reference: `bank-loanrepay:${loan.id}:${depositTxnId}`,
      },
    });
    await tx.dataBankAccount.update({
      where: { id: account.id },
      data: { balanceMb: account.balanceMb - repaidMb },
    });
    await tx.dataLoanTransaction.create({
      data: {
        loanId: loan.id,
        type: 'BANK_REPAYMENT',
        amountMb: repaidMb,
        balanceAfterMb: outstanding,
        reference: loanRefs.bankRepay(loan.id, depositTxnId),
        description: 'Repaid from newly banked data',
      },
    });
    await tx.dataLoan.update({
      where: { id: loan.id },
      data: {
        outstandingAmountMb: outstanding,
        status,
        ...(status === 'REPAID' ? { repaidAt: now } : {}),
      },
    });
    await notify(
      tx,
      loan.userId,
      status === 'REPAID' ? 'Data Loan repaid' : 'Loan repayment applied',
      status === 'REPAID'
        ? `${repaidMb} MB repaid — your Data Loan is fully settled.`
        : `${repaidMb} MB repaid from your Data Bank. ${outstanding} MB remaining.`,
    );

    return { repaidMb, outstandingMb: outstanding };
  }

  // -----------------------------------------------------------------------
  // 6.4 — Settle on recharge (called inside the order-fulfilment tx)
  // -----------------------------------------------------------------------

  /**
   * When a recharge order completes on a SIM with an open loan, the full
   * outstanding is settled from the new plan. `loan-settle:{loan}:{order}`
   * makes a replayed webhook a no-op.
   */
  async settleOnRecharge(
    tx: Tx,
    simId: string | null,
    orderId: string,
    now = new Date(),
  ): Promise<boolean> {
    if (!simId) return false;
    const loan = await tx.dataLoan.findFirst({
      where: { simId, status: { in: OPEN_LOAN_STATUSES } },
    });
    if (!loan) return false;

    await tx.$queryRaw`SELECT id FROM "DataLoan" WHERE id = ${loan.id} FOR UPDATE`;

    const settledMb = loan.outstandingAmountMb;
    try {
      await tx.dataLoanTransaction.create({
        data: {
          loanId: loan.id,
          type: 'RECHARGE_REPAYMENT',
          amountMb: settledMb,
          balanceAfterMb: 0,
          reference: loanRefs.settle(loan.id, orderId),
          description: 'Settled by recharge',
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) return false; // already settled for this order
      throw err;
    }

    await tx.dataLoan.update({
      where: { id: loan.id },
      data: { outstandingAmountMb: 0, status: 'SETTLED', repaidAt: now },
    });
    await notify(
      tx,
      loan.userId,
      'Data Loan settled',
      `${settledMb} MB of your recharge was used to settle your Data Loan.`,
    );
    return true;
  }

  // -----------------------------------------------------------------------
  // 6.3 — Nightly job: mark DUE once, then repay DUE loans from stored bank
  // -----------------------------------------------------------------------

  /**
   * Every open loan is processed in its own transaction so one bad row can't
   * stop the rest. Safe to run any number of times: the DUE transition is
   * status-guarded and the nightly repayment uses a deterministic per-day
   * reference that the unique index rejects on replay.
   */
  async runNightlyTick(asOf = new Date()) {
    const loans = await this.prisma.dataLoan.findMany({
      where: { status: { in: OPEN_LOAN_STATUSES } },
    });

    let markedDue = 0;
    let repaidMb = 0;
    let repaidCount = 0;
    let errors = 0;

    for (const row of loans) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "DataLoan" WHERE id = ${row.id} FOR UPDATE`;
          const loan = await tx.dataLoan.findUnique({
            where: { id: row.id },
          });
          if (
            !loan ||
            !OPEN_LOAN_STATUSES.includes(loan.status) ||
            loan.outstandingAmountMb <= 0
          ) {
            return { due: false, repaid: 0 };
          }

          // Past dueAt → DUE, exactly once (guarded on the pre-DUE statuses).
          let status = loan.status;
          if (loan.dueAt && loan.dueAt < asOf && status !== 'DUE') {
            const claimed = await tx.dataLoan.updateMany({
              where: {
                id: loan.id,
                status: { in: ['ACTIVE', 'PARTIALLY_REPAID'] },
              },
              data: { status: 'DUE' },
            });
            if (claimed.count === 1) {
              status = 'DUE';
              await notify(
                tx,
                loan.userId,
                'Data Loan due',
                `Your ${loan.originalAmountMb} MB Data Loan is due — ${loan.outstandingAmountMb} MB remains. Pay it back or recharge to settle.`,
              );
            }
          }

          // Only DUE loans may draw down previously banked savings.
          if (status !== 'DUE') return { due: false, repaid: 0 };

          const account = await tx.dataBankAccount.findUnique({
            where: { simId: loan.simId },
          });
          const repay = Math.min(
            account?.balanceMb ?? 0,
            loan.outstandingAmountMb,
          );
          if (!account || repay <= 0) {
            return { due: true, repaid: 0 };
          }

          const outstanding = loan.outstandingAmountMb - repay;
          const reference = loanRefs.nightlyRepay(loan.id, asOf);
          try {
            await tx.dataBankTransaction.create({
              data: {
                dataBankId: account.id,
                type: 'ADJUSTMENT',
                amountMb: repay,
                balanceAfterMb: account.balanceMb - repay,
                description: 'Data Loan repayment (auto)',
                reference: `bank-${reference}`,
              },
            });
            await tx.dataLoanTransaction.create({
              data: {
                loanId: loan.id,
                type: 'BANK_REPAYMENT',
                amountMb: repay,
                balanceAfterMb: outstanding,
                reference,
                description: 'Auto-repaid from Data Bank',
              },
            });
          } catch (err) {
            if (isUniqueViolation(err)) {
              return { due: true, repaid: 0 }; // same-day replay
            }
            throw err;
          }

          await tx.dataBankAccount.update({
            where: { id: account.id },
            data: { balanceMb: account.balanceMb - repay },
          });
          await tx.dataLoan.update({
            where: { id: loan.id },
            data: {
              outstandingAmountMb: outstanding,
              status: outstanding === 0 ? 'REPAID' : 'DUE',
              ...(outstanding === 0 ? { repaidAt: asOf } : {}),
            },
          });
          await notify(
            tx,
            loan.userId,
            outstanding === 0 ? 'Data Loan repaid' : 'Loan repayment applied',
            outstanding === 0
              ? `${repay} MB repaid from your Data Bank — your Data Loan is fully settled.`
              : `${repay} MB repaid from your Data Bank. ${outstanding} MB remaining.`,
          );
          return { due: true, repaid: repay };
        });

        if (result.due) markedDue++;
        if (result.repaid > 0) {
          repaidMb += result.repaid;
          repaidCount++;
        }
      } catch (err) {
        errors++;
        this.logger.error(
          `Loan nightly failed for ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const summary = {
      asOf: asOf.toISOString(),
      scanned: loans.length,
      dueLoans: markedDue,
      repaidLoans: repaidCount,
      repaidMb,
      errors,
    };
    if (markedDue || repaidCount || errors) {
      this.logger.log(`Loan nightly: ${JSON.stringify(summary)}`);
    }
    return summary;
  }

  // -----------------------------------------------------------------------
  // Admin
  // -----------------------------------------------------------------------

  async adminList(query: ListAdminLoansQueryDto) {
    const { skip, take, page, limit } = pageParams(query);
    const search = query.search?.trim();

    const where: Prisma.DataLoanWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              {
                sim: {
                  phoneNumber: {
                    number: { contains: search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.dataLoan.count({ where }),
      this.prisma.dataLoan.findMany({
        where,
        skip,
        take,
        orderBy: { borrowedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          sim: {
            select: {
              id: true,
              status: true,
              phoneNumber: { select: { number: true } },
            },
          },
          _count: { select: { transactions: true } },
        },
      }),
    ]);

    return { data: rows, meta: listMeta(total, page, limit) };
  }

  async adminSummary(now = new Date()) {
    const [open, due, repayments] = await Promise.all([
      this.prisma.dataLoan.findMany({
        where: { status: { in: OPEN_LOAN_STATUSES } },
      }),
      this.prisma.dataLoan.count({ where: { status: 'DUE' } }),
      this.prisma.dataLoanTransaction.findMany({
        where: {
          type: { in: ['BANK_REPAYMENT', 'RECHARGE_REPAYMENT'] },
          processedAt: { gte: istMonthStart(now) },
        },
      }),
    ]);

    return {
      openCount: open.length,
      dueCount: due,
      totalOutstandingMb: open.reduce(
        (sum, loan) => sum + loan.outstandingAmountMb,
        0,
      ),
      repaidThisMonthMb: repayments.reduce(
        (sum, txn) => sum + txn.amountMb,
        0,
      ),
      demoJobsEnabled: process.env.ALLOW_DEMO_JOBS === 'true',
    };
  }

  async adminGet(id: string) {
    const loan = await this.prisma.dataLoan.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        sim: {
          select: {
            id: true,
            status: true,
            category: true,
            phoneNumber: { select: { number: true } },
          },
        },
        transactions: { orderBy: { processedAt: 'asc' } },
      },
    });
    if (!loan) {
      throw new ApiException(404, 'LOAN_NOT_FOUND', 'Loan not found');
    }
    return loan;
  }

  /** Admin write-off of an open loan — records an ADJUSTMENT for the rest. */
  async adminCancel(id: string, reason: string, now = new Date()) {
    const loan = await this.prisma.dataLoan.findUnique({ where: { id } });
    if (!loan) {
      throw new ApiException(404, 'LOAN_NOT_FOUND', 'Loan not found');
    }
    if (!OPEN_LOAN_STATUSES.includes(loan.status)) {
      throw new ApiException(
        409,
        'LOAN_NOT_OPEN',
        `Only an open loan can be cancelled (this one is ${loan.status.toLowerCase()}).`,
      );
    }

    const outstanding = loan.outstandingAmountMb;
    return this.prisma.$transaction(async (tx) => {
      // Re-check inside the transaction so a concurrent settle can't race.
      const claimed = await tx.dataLoan.updateMany({
        where: { id: loan.id, status: { in: OPEN_LOAN_STATUSES } },
        data: { status: 'CANCELLED', outstandingAmountMb: 0, repaidAt: now },
      });
      if (claimed.count === 0) {
        throw new ApiException(
          409,
          'LOAN_NOT_OPEN',
          'This loan was just resolved and can no longer be cancelled.',
        );
      }
      await tx.dataLoanTransaction.create({
        data: {
          loanId: loan.id,
          type: 'ADJUSTMENT',
          amountMb: outstanding,
          balanceAfterMb: 0,
          reference: loanRefs.cancel(loan.id),
          description: `Cancelled by admin: ${reason}`,
        },
      });
      await notify(
        tx,
        loan.userId,
        'Data Loan cancelled',
        `Your Data Loan was cancelled by support. Reason: ${reason}`,
      );
      return tx.dataLoan.findUnique({ where: { id: loan.id } });
    });
  }
}
