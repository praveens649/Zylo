import { describe, expect, it } from 'vitest';
import { createFakePrisma } from '../../test/fake-prisma.js';
import { LoansService } from './loans.service.js';
import { DAY_MS } from './loan-rules.js';

const now = new Date('2026-10-28T10:00:00Z');
const user = { id: 'u1', isActive: true } as any;

const sim = (over: Record<string, unknown> = {}) => ({
  id: 'sim1',
  userId: 'u1',
  status: 'ACTIVE',
  ...over,
});
const plan = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  dataBankEnabled: true,
  dailyDataAllowanceMb: 1024,
  ...over,
});
const subscription = (over: Record<string, unknown> = {}) => ({
  id: 'sub1',
  simId: 'sim1',
  planId: 'p1',
  status: 'ACTIVE',
  startDate: new Date('2026-10-01T00:00:00Z'),
  endDate: new Date('2026-11-20T00:00:00Z'),
  ...over,
});
const openLoan = (over: Record<string, unknown> = {}) => ({
  id: 'loan1',
  userId: 'u1',
  simId: 'sim1',
  originalAmountMb: 500,
  outstandingAmountMb: 500,
  status: 'ACTIVE',
  borrowedAt: now,
  dueAt: new Date(now.getTime() + 7 * DAY_MS),
  repaidAt: null,
  ...over,
});

const eligibleSeed = (over: Record<string, unknown[]> = {}) =>
  createFakePrisma({
    sim: [sim()],
    plan: [plan()],
    planSubscription: [subscription()],
    ...over,
  });

const borrow = (svc: LoansService, amountMb = 500, key = 'k-1') =>
  svc.borrow(user, { simId: 'sim1', amountMb }, key, now);

describe('borrow', () => {
  it('creates exactly one loan, one LOAN_ISSUED row and one notification', async () => {
    const prisma = eligibleSeed();
    const loan = (await borrow(new LoansService(prisma)))!;

    expect(prisma.dataLoan.rows).toHaveLength(1);
    expect(loan.status).toBe('ACTIVE');
    expect(loan.originalAmountMb).toBe(500);
    expect(loan.outstandingAmountMb).toBe(500);
    expect(loan.dueAt).toEqual(new Date(now.getTime() + 7 * DAY_MS));

    const txns = prisma.dataLoanTransaction.rows;
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({
      type: 'LOAN_ISSUED',
      amountMb: 500,
      balanceAfterMb: 500,
      reference: 'loan-issue:sim1:k-1',
    });
    expect(prisma.notification.rows).toHaveLength(1);

    // Borrowed MB lands in today's usable pool, on top of the plan allowance.
    expect(prisma.dailyDataUsage.rows).toHaveLength(1);
    expect(prisma.dailyDataUsage.rows[0]).toMatchObject({
      simId: 'sim1',
      allowanceMb: 1024 + 500,
    });
  });

  it('adds to an existing daily pool instead of replacing it', async () => {
    const prisma = eligibleSeed({
      dailyDataUsage: [
        {
          id: 'du1',
          simId: 'sim1',
          planId: 'p1',
          cycleDate: new Date('2026-10-28T00:00:00.000Z'),
          allowanceMb: 1024,
          usedMb: 700,
        },
      ],
    });
    await borrow(new LoansService(prisma));
    expect(prisma.dailyDataUsage.rows[0].allowanceMb).toBe(1024 + 500);
    expect(prisma.dailyDataUsage.rows).toHaveLength(1);
  });

  it('rejects an inactive account and a non-active or foreign SIM', async () => {
    const prisma = eligibleSeed();
    const svc = new LoansService(prisma);

    await expect(
      svc.borrow(
        { id: 'u1', isActive: false } as any,
        { simId: 'sim1', amountMb: 500 },
        'k',
        now,
      ),
    ).rejects.toMatchObject({ code: 'ACCOUNT_INACTIVE' });

    prisma.sim.rows.push({ id: 'sim2', userId: 'u2', status: 'ACTIVE' });
    await expect(
      svc.borrow(user, { simId: 'sim2', amountMb: 500 }, 'k', now),
    ).rejects.toMatchObject({ code: 'SIM_NOT_FOUND', status: 404 });
    await expect(svc.getActive('sim2', 'u1')).rejects.toMatchObject({
      status: 404,
    });
    await expect(svc.listForSim('sim2', 'u1')).rejects.toMatchObject({
      status: 404,
    });

    prisma.sim.rows[0].status = 'SUSPENDED';
    await expect(borrow(svc)).rejects.toMatchObject({ code: 'SIM_NOT_ACTIVE' });
  });

  it('rejects missing and ineligible plans', async () => {
    const noPlan = eligibleSeed({ planSubscription: [] });
    await expect(borrow(new LoansService(noPlan))).rejects.toMatchObject({
      code: 'NO_ACTIVE_PLAN',
    });

    const wrongPlan = eligibleSeed({ plan: [plan({ dataBankEnabled: false })] });
    await expect(borrow(new LoansService(wrongPlan))).rejects.toMatchObject({
      code: 'PLAN_NOT_ELIGIBLE',
    });
  });

  it('rejects a second open loan and loans past the monthly cap', async () => {
    const withOpen = eligibleSeed({ dataLoan: [openLoan()] });
    await expect(borrow(new LoansService(withOpen))).rejects.toMatchObject({
      code: 'OPEN_LOAN_EXISTS',
    });

    const capped = eligibleSeed({
      dataLoan: [
        openLoan({
          id: 'old1',
          status: 'REPAID',
          outstandingAmountMb: 0,
          borrowedAt: new Date('2026-10-05T00:00:00Z'),
        }),
        openLoan({
          id: 'old2',
          status: 'REPAID',
          outstandingAmountMb: 0,
          borrowedAt: new Date('2026-10-10T00:00:00Z'),
        }),
      ],
    });
    await expect(borrow(new LoansService(capped))).rejects.toMatchObject({
      code: 'MONTHLY_LIMIT_REACHED',
    });
  });

  it('validates amount rules', async () => {
    const svc = new LoansService(eligibleSeed());
    await expect(borrow(svc, 50)).rejects.toMatchObject({
      code: 'AMOUNT_INVALID',
    });
    await expect(borrow(svc, 130)).rejects.toMatchObject({
      code: 'AMOUNT_INVALID',
    });
    await expect(borrow(svc, 600)).rejects.toMatchObject({
      code: 'AMOUNT_TOO_HIGH',
    });
    await expect(
      svc.borrow(user, { simId: 'sim1', amountMb: 500 }, undefined, now),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED', status: 400 });
  });

  it('creates exactly one loan for repeated borrows on one SIM', async () => {
    const prisma = eligibleSeed();
    const svc = new LoansService(prisma);

    await borrow(svc, 500, 'k-1');
    // A second request with a different key hits the open-loan rule —
    // the same outcome a parallel race produces under the row lock.
    await expect(borrow(svc, 250, 'k-2')).rejects.toMatchObject({
      code: 'OPEN_LOAN_EXISTS',
    });
    expect(prisma.dataLoan.rows).toHaveLength(1);
  });

  it('returns the same loan for the same Idempotency-Key', async () => {
    const prisma = eligibleSeed();
    const svc = new LoansService(prisma);

    const first = await borrow(svc, 500, 'same-key');
    const second = await borrow(svc, 500, 'same-key');
    expect(second!.id).toBe(first!.id);
    expect(prisma.dataLoan.rows).toHaveLength(1);
    expect(prisma.dataLoanTransaction.rows).toHaveLength(1);
    expect(prisma.notification.rows).toHaveLength(1);
  });

  it('refuses a direct insert of a second open loan (partial index rule)', async () => {
    const prisma = eligibleSeed({ dataLoan: [openLoan()] });
    await expect(
      prisma.dataLoan.create({
        data: {
          userId: 'u1',
          simId: 'sim1',
          originalAmountMb: 100,
          outstandingAmountMb: 100,
          status: 'ACTIVE',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});

describe('repay from Data Bank deposit', () => {
  const seed = () =>
    eligibleSeed({
      dataLoan: [openLoan()],
      dataBankAccount: [
        { id: 'bank1', simId: 'sim1', balanceMb: 300 }, // deposit already credited
      ],
    });

  it('moves ACTIVE → PARTIALLY_REPAID → REPAID, bank never negative', async () => {
    const prisma = seed();
    const svc = new LoansService(prisma);

    const r1 = await svc.repayFromDeposit(prisma, 'sim1', 300, 'dep-1', now);
    expect(r1).toEqual({ repaidMb: 300, outstandingMb: 200 });
    expect(prisma.dataLoan.rows[0]).toMatchObject({
      outstandingAmountMb: 200,
      status: 'PARTIALLY_REPAID',
    });
    expect(prisma.dataBankAccount.rows[0].balanceMb).toBe(0);

    // Second deposit of 400 — only the remaining 200 goes to the loan.
    prisma.dataBankAccount.rows[0].balanceMb = 400;
    const r2 = await svc.repayFromDeposit(prisma, 'sim1', 400, 'dep-2', now);
    expect(r2).toEqual({ repaidMb: 200, outstandingMb: 0 });
    expect(prisma.dataLoan.rows[0]).toMatchObject({
      outstandingAmountMb: 0,
      status: 'REPAID',
      repaidAt: now,
    });
    expect(prisma.dataBankAccount.rows[0].balanceMb).toBe(200);

    const bankTxns = prisma.dataBankTransaction.rows;
    const loanTxns = prisma.dataLoanTransaction.rows;
    expect(bankTxns).toHaveLength(2);
    expect(bankTxns[0].balanceAfterMb).toBe(0);
    expect(bankTxns[1].balanceAfterMb).toBe(200);
    expect(loanTxns.map((t: any) => t.type)).toEqual([
      'BANK_REPAYMENT',
      'BANK_REPAYMENT',
    ]);
    expect(prisma.notification.rows).toHaveLength(2);
  });

  it('does nothing without an open loan', async () => {
    const prisma = eligibleSeed({
      dataBankAccount: [{ id: 'bank1', simId: 'sim1', balanceMb: 300 }],
    });
    const r = await new LoansService(prisma).repayFromDeposit(
      prisma,
      'sim1',
      300,
      'dep-1',
      now,
    );
    expect(r.repaidMb).toBe(0);
    expect(prisma.dataBankAccount.rows[0].balanceMb).toBe(300);
    expect(prisma.dataLoanTransaction.rows).toHaveLength(0);
  });
});

describe('nightly job', () => {
  it('marks DUE once, repays only DUE loans from the bank, and is idempotent', async () => {
    const prisma = eligibleSeed({
      dataLoan: [
        openLoan({ id: 'due-loan', dueAt: new Date(now.getTime() - DAY_MS) }),
        openLoan({
          id: 'fresh-loan',
          simId: 'sim2',
          status: 'ACTIVE',
          dueAt: new Date(now.getTime() + 5 * DAY_MS),
        }),
      ],
      dataBankAccount: [{ id: 'bank1', simId: 'sim1', balanceMb: 400 }],
    });
    const svc = new LoansService(prisma);

    // The fresh (not-yet-due) loan keeps its bank balance untouched even
    // though it is open — only DUE loans draw down stored savings.
    const first = await svc.runNightlyTick(now);
    const dueLoan = prisma.dataLoan.rows.find((l: any) => l.id === 'due-loan');
    expect(dueLoan.status).toBe('DUE');
    expect(dueLoan.outstandingAmountMb).toBe(100); // 500 - 400 banked
    expect(prisma.dataBankAccount.rows[0].balanceMb).toBe(0);
    expect(first.repaidMb).toBe(400);

    const second = await svc.runNightlyTick(now);
    expect(second.repaidMb).toBe(0);
    expect(dueLoan.outstandingAmountMb).toBe(100);
    expect(
      prisma.dataLoanTransaction.rows.filter((t: any) => t.loanId === 'due-loan'),
    ).toHaveLength(1); // deterministic ref blocked the replay

    // Next day's run repays the remaining 100 if the bank refilled.
    prisma.dataBankAccount.rows[0].balanceMb = 250;
    await svc.runNightlyTick(new Date(now.getTime() + DAY_MS));
    expect(dueLoan.status).toBe('REPAID');
    expect(dueLoan.outstandingAmountMb).toBe(0);
  });

  it('leaves a not-yet-due loan ACTIVE and does not repay it', async () => {
    const prisma = eligibleSeed({
      dataLoan: [openLoan()],
      dataBankAccount: [{ id: 'bank1', simId: 'sim1', balanceMb: 500 }],
    });
    await new LoansService(prisma).runNightlyTick(now);
    expect(prisma.dataLoan.rows[0].status).toBe('ACTIVE');
    expect(prisma.dataLoan.rows[0].outstandingAmountMb).toBe(500);
    expect(prisma.dataBankAccount.rows[0].balanceMb).toBe(500);
  });
});

describe('settle on recharge', () => {
  it('settles once — a replayed webhook does not double settle', async () => {
    const prisma = eligibleSeed({ dataLoan: [openLoan({ status: 'DUE' })] });
    const svc = new LoansService(prisma);

    expect(await svc.settleOnRecharge(prisma, 'sim1', 'order-1', now)).toBe(
      true,
    );
    const loan = prisma.dataLoan.rows[0];
    expect(loan).toMatchObject({
      status: 'SETTLED',
      outstandingAmountMb: 0,
      repaidAt: now,
    });
    expect(
      prisma.dataLoanTransaction.rows.filter(
        (t: any) => t.type === 'RECHARGE_REPAYMENT',
      ),
    ).toHaveLength(1);

    expect(await svc.settleOnRecharge(prisma, 'sim1', 'order-1', now)).toBe(
      false,
    );
    expect(prisma.dataLoanTransaction.rows).toHaveLength(1);
  });
});

describe('admin cancel', () => {
  it('cancels an open loan and refuses resolved ones', async () => {
    const prisma = eligibleSeed({
      dataLoan: [
        openLoan(),
        openLoan({ id: 'paid', simId: 'sim1', status: 'REPAID', outstandingAmountMb: 0 }),
      ],
    });
    const svc = new LoansService(prisma);

    const cancelled = (await svc.adminCancel('loan1', 'Duplicate issue', now))!;
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.outstandingAmountMb).toBe(0);
    const adj = prisma.dataLoanTransaction.rows.find(
      (t: any) => t.type === 'ADJUSTMENT',
    );
    expect(adj).toMatchObject({ amountMb: 500, balanceAfterMb: 0 });
    expect(prisma.notification.rows).toHaveLength(1);

    await expect(
      svc.adminCancel('paid', 'too late', now),
    ).rejects.toMatchObject({ code: 'LOAN_NOT_OPEN', status: 409 });
  });
});

describe('invariant', () => {
  it('original − Σ(repayments + adjustments) = outstanding for every loan', async () => {
    const prisma = eligibleSeed({
      dataLoan: [openLoan()],
      dataBankAccount: [{ id: 'bank1', simId: 'sim1', balanceMb: 300 }],
    });
    const svc = new LoansService(prisma);

    await svc.repayFromDeposit(prisma, 'sim1', 300, 'dep-1', now);
    await svc.runNightlyTick(new Date(now.getTime() + 8 * DAY_MS));
    await svc.settleOnRecharge(prisma, 'sim1', 'order-9', now);

    for (const loan of prisma.dataLoan.rows) {
      const repaid = prisma.dataLoanTransaction.rows
        .filter(
          (t: any) =>
            t.loanId === loan.id &&
            ['BANK_REPAYMENT', 'RECHARGE_REPAYMENT', 'ADJUSTMENT'].includes(
              t.type,
            ),
        )
        .reduce((s: any, t: any) => s + t.amountMb, 0);
      expect(loan.originalAmountMb - repaid).toBe(loan.outstandingAmountMb);
      for (const txn of prisma.dataLoanTransaction.rows.filter(
        (t: any) => t.loanId === loan.id,
      )) {
        expect(txn.balanceAfterMb).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
