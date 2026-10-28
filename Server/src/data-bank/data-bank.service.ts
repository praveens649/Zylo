import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import type { PlanModel } from '../generated/prisma/models.js';

/** Business timezone for determining the daily cycle boundary. */
const TIME_ZONE = 'Asia/Kolkata';

/** Demo defaults used when a plan does not configure its own limits. */
const DEFAULT_ROLLOVER_LIMIT_MB = 10240; // 10 GB
const DEFAULT_ROLLOVER_EXPIRY_DAYS = 90;

@Injectable()
export class DataBankService {
  private readonly logger = new Logger(DataBankService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private getCycleDate(date = new Date()): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const get = (type: string) =>
      parts.find((p) => p.type === type)!.value;

    return new Date(
      `${get('year')}-${get('month')}-${get('day')}T00:00:00.000Z`,
    );
  }

  /**
   * Fetch a SIM owned by `userId` and confirm it is ACTIVE with an active
   * plan subscription that has Data Bank enabled.
   */
  private async getEligibleSim(simId: string, userId: string) {
    const sim = await this.prisma.sim.findFirst({
      where: { id: simId, userId, status: 'ACTIVE' },
      include: {
        planSubscriptions: {
          where: {
            status: 'ACTIVE',
            startDate: { lte: new Date() },
            endDate: { gt: new Date() },
          },
          include: { plan: true },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!sim) {
      throw new ApiException(
        404,
        'SIM_NOT_FOUND',
        'Active SIM not found or does not belong to this account.',
      );
    }

    const subscription = sim.planSubscriptions[0];
    if (!subscription) {
      throw new ApiException(
        400,
        'NO_ACTIVE_PLAN',
        'This SIM has no active plan. Please recharge first.',
      );
    }

    if (!subscription.plan.dataBankEnabled) {
      throw new ApiException(
        400,
        'DATA_BANK_NOT_ENABLED',
        'The active plan does not include the Zylo Data Bank feature.',
      );
    }

    return { sim, plan: subscription.plan };
  }

  /**
   * How many MB can still be saved from this usage cycle right now —
   * all of today's remaining unused data, up to the bank's capacity.
   */
  private computeSavableMb(
    plan: PlanModel,
    daily: { allowanceMb: number; usedMb: number; bankedMb: number } | null,
    balanceMb: number,
    allowanceMb: number,
  ) {
    const unusedMb = daily
      ? Math.max(0, daily.allowanceMb - daily.usedMb)
      : allowanceMb;
    const bankedMb = daily?.bankedMb ?? 0;
    const rolloverLimit = plan.rolloverLimitMb ?? DEFAULT_ROLLOVER_LIMIT_MB;

    return Math.max(
      0,
      Math.min(
        unusedMb - bankedMb, // today's remaining unused data
        rolloverLimit - balanceMb, // remaining bank capacity
      ),
    );
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Data Bank status for a SIM: balance, limits, today's savable amount,
   * and the most recent ledger entries.
   */
  async getStatus(simId: string, userId: string) {
    const { plan } = await this.getEligibleSim(simId, userId);
    const cycleDate = this.getCycleDate();

    const [account, daily] = await Promise.all([
      this.prisma.dataBankAccount.findUnique({ where: { simId } }),
      this.prisma.dailyDataUsage.findUnique({
        where: { simId_cycleDate: { simId, cycleDate } },
      }),
    ]);

    const balanceMb = account?.balanceMb ?? 0;
    const allowanceMb = plan.dailyDataAllowanceMb ?? 0;

    const transactions = account
      ? await this.prisma.dataBankTransaction.findMany({
          where: { dataBankId: account.id },
          orderBy: { processedAt: 'desc' },
          take: 10,
        })
      : [];

    return {
      balanceMb,
      capacityMb: plan.rolloverLimitMb ?? DEFAULT_ROLLOVER_LIMIT_MB,
      rolloverExpiryDays:
        plan.rolloverExpiryDays ?? DEFAULT_ROLLOVER_EXPIRY_DAYS,
      savableTodayMb: this.computeSavableMb(
        plan,
        daily,
        balanceMb,
        allowanceMb,
      ),
      today: {
        allowanceMb: daily?.allowanceMb ?? allowanceMb,
        usedMb: daily?.usedMb ?? 0,
        bankedMb: daily?.bankedMb ?? 0,
        redeemedMb: daily?.redeemedMb ?? 0,
      },
      transactions,
    };
  }

  /**
   * Save today's unused data into the Data Bank.
   *
   * Idempotent per daily cycle: `bankedMb` on the DailyDataUsage row records
   * how much has already been saved, so a repeat call deposits 0 (rejected).
   * Balance + ledger entry + usage marker update happen in one transaction.
   */
  async saveUnused(simId: string, userId: string) {
    const { plan } = await this.getEligibleSim(simId, userId);
    const cycleDate = this.getCycleDate();
    const allowanceMb = plan.dailyDataAllowanceMb;

    if (allowanceMb == null || allowanceMb <= 0) {
      throw new ApiException(
        400,
        'NO_DAILY_ALLOWANCE',
        'The active plan has no daily data allowance to save from.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Today's usage record — create an unused (0 MB) one so the save can
      // still happen on days the customer never ran the simulation.
      const daily = await tx.dailyDataUsage.upsert({
        where: { simId_cycleDate: { simId, cycleDate } },
        create: {
          simId,
          planId: plan.id,
          cycleDate,
          allowanceMb,
          usedMb: 0,
        },
        update: {},
      });

      // Bank account — create lazily for SIMs activated before this feature.
      const account = await tx.dataBankAccount.upsert({
        where: { simId },
        create: { simId, balanceMb: 0 },
        update: {},
      });

      const saveMb = this.computeSavableMb(
        plan,
        daily,
        account.balanceMb,
        allowanceMb,
      );

      if (saveMb <= 0) {
        const reason =
          (plan.rolloverLimitMb ?? DEFAULT_ROLLOVER_LIMIT_MB) -
            account.balanceMb <=
          0
            ? 'Your Data Bank is full.'
            : 'There is no unused data left to save today.';
        throw new ApiException(400, 'NOTHING_TO_SAVE', reason);
      }

      const newBalanceMb = account.balanceMb + saveMb;
      const expiryDays =
        plan.rolloverExpiryDays ?? DEFAULT_ROLLOVER_EXPIRY_DAYS;

      const [transaction] = await Promise.all([
        tx.dataBankTransaction.create({
          data: {
            dataBankId: account.id,
            type: 'DEPOSIT',
            amountMb: saveMb,
            balanceAfterMb: newBalanceMb,
            description: 'Daily unused data rollover',
            dailyUsageId: daily.id,
            expiresAt: new Date(
              Date.now() + expiryDays * 24 * 60 * 60 * 1000,
            ),
          },
        }),
        tx.dataBankAccount.update({
          where: { id: account.id },
          data: { balanceMb: newBalanceMb },
        }),
        tx.dailyDataUsage.update({
          where: { id: daily.id },
          data: { bankedMb: daily.bankedMb + saveMb, bankedAt: new Date() },
        }),
      ]);

      this.logger.log(
        `Banked ${saveMb} MB for SIM ${simId} ` +
          `(balance now ${newBalanceMb} MB)`,
      );

      return {
        savedMb: saveMb,
        balanceMb: newBalanceMb,
        reference: transaction.reference,
        expiresAt: transaction.expiresAt,
      };
    });
  }

  /**
   * Redeem data from the Data Bank back into today's usable pool.
   * Writes a REDEMPTION ledger entry, decrements the bank balance, and
   * increments `redeemedMb` on today's usage record — which raises
   * today's remaining data without touching the base allowance.
   */
  async redeem(simId: string, userId: string, amountMb: number) {
    const { plan } = await this.getEligibleSim(simId, userId);
    const cycleDate = this.getCycleDate();
    const allowanceMb = plan.dailyDataAllowanceMb;

    if (allowanceMb == null || allowanceMb <= 0) {
      throw new ApiException(
        400,
        'NO_DAILY_ALLOWANCE',
        'The active plan has no daily data pool to redeem into.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.dataBankAccount.findUnique({
        where: { simId },
      });

      if (!account || account.balanceMb <= 0) {
        throw new ApiException(
          400,
          'BANK_EMPTY',
          'Your Data Bank is empty. Save unused data first.',
        );
      }

      if (amountMb > account.balanceMb) {
        throw new ApiException(
          400,
          'INSUFFICIENT_BANK_BALANCE',
          `You only have ${account.balanceMb} MB in your Data Bank.`,
        );
      }

      const daily = await tx.dailyDataUsage.upsert({
        where: { simId_cycleDate: { simId, cycleDate } },
        create: {
          simId,
          planId: plan.id,
          cycleDate,
          allowanceMb,
          usedMb: 0,
        },
        update: {},
      });

      const newBalanceMb = account.balanceMb - amountMb;

      const [transaction] = await Promise.all([
        tx.dataBankTransaction.create({
          data: {
            dataBankId: account.id,
            type: 'REDEMPTION',
            amountMb,
            balanceAfterMb: newBalanceMb,
            description: "Redeemed to today's data usage",
            dailyUsageId: daily.id,
          },
        }),
        tx.dataBankAccount.update({
          where: { id: account.id },
          data: { balanceMb: newBalanceMb },
        }),
        tx.dailyDataUsage.update({
          where: { id: daily.id },
          data: { redeemedMb: daily.redeemedMb + amountMb },
        }),
      ]);

      this.logger.log(
        `Redeemed ${amountMb} MB for SIM ${simId} ` +
          `(bank balance now ${newBalanceMb} MB)`,
      );

      return {
        redeemedMb: amountMb,
        balanceMb: newBalanceMb,
        reference: transaction.reference,
      };
    });
  }
}
