import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';

/** Simulated consumption rate — 100 MB per second. */
const RATE_MB_PER_SECOND = 100;

/** Business timezone for determining the daily cycle boundary. */
const TIME_ZONE = 'Asia/Kolkata';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class UsageSimulationService {
  private readonly logger = new Logger(UsageSimulationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Return the start-of-day UTC timestamp that corresponds to "today" in IST.
   * Stored as a DATE column so only the date part matters for uniqueness.
   */
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
   * Fetch the SIM owned by `userId` and confirm it is ACTIVE and has an
   * active plan subscription with a configured daily allowance.
   * Throws appropriate ApiExceptions so the caller gets a clean 4xx.
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

    const allowance = subscription.plan.dailyDataAllowanceMb;
    if (allowance == null || allowance <= 0) {
      throw new ApiException(
        400,
        'SIMULATION_NOT_AVAILABLE',
        'The active plan does not have a daily data simulation allowance configured.',
      );
    }

    return { sim, plan: subscription.plan, allowance };
  }

  /**
   * Compute how many MB a running session has consumed since it started,
   * capped at the remaining allowance for the day.
   */
  private calculateConsumed(startedAt: Date, remainingMb: number): number {
    const elapsedSeconds = Math.max(
      0,
      (Date.now() - startedAt.getTime()) / 1000,
    );
    return Math.min(remainingMb, Math.floor(elapsedSeconds * RATE_MB_PER_SECOND));
  }

  /**
   * Finalize RUNNING sessions that belong to a previous daily cycle.
   * A session cannot span cycles — its consumption is capped at the end of
   * the cycle it started in, and the day's usage record is updated. Must be
   * called inside a transaction before starting/stopping a session so a
   * stale RUNNING row can't block the next day (partial unique index).
   */
  private async finalizeStaleSessions(
    tx: Prisma.TransactionClient,
    simId: string,
    currentCycleDate: Date,
  ) {
    const stale = await tx.usageSimulation.findMany({
      where: {
        simId,
        status: 'RUNNING',
        dailyUsage: { cycleDate: { lt: currentCycleDate } },
      },
      include: { dailyUsage: true },
    });

    for (const s of stale) {
      const cycleEnd = s.dailyUsage.cycleDate.getTime() + DAY_MS;
      const elapsedSeconds = Math.max(
        0,
        (Math.min(Date.now(), cycleEnd) - s.startedAt.getTime()) / 1000,
      );
      const consumed = Math.min(
        s.dailyUsage.allowanceMb -
          s.dailyUsage.usedMb -
          s.dailyUsage.bankedMb +
          s.dailyUsage.redeemedMb,
        Math.floor(elapsedSeconds * RATE_MB_PER_SECOND),
      );
      const newUsedMb = s.dailyUsage.usedMb + consumed;

      await tx.dailyDataUsage.update({
        where: { id: s.dailyUsageId },
        data: { usedMb: newUsedMb },
      });
      await tx.usageSimulation.update({
        where: { id: s.id },
        data: {
          status:
            newUsedMb >= s.dailyUsage.allowanceMb ? 'COMPLETED' : 'STOPPED',
          stoppedAt: new Date(Math.min(Date.now(), cycleEnd)),
          consumedMb: consumed,
        },
      });
    }
  }

  // -----------------------------------------------------------------------
  // Public API — called by the controller
  // -----------------------------------------------------------------------

  /**
   * Start a usage simulation session for a SIM.
   *
   * - Creates the DailyDataUsage record for today if one does not exist yet.
   * - Rejects if the daily allowance is already exhausted.
   * - Rejects if a session is already RUNNING for this SIM.
   * - The partial unique index in the DB enforces the one-running constraint
   *   even under concurrent requests.
   */
  async start(simId: string, userId: string) {
    const { plan, allowance } = await this.getEligibleSim(simId, userId);
    const cycleDate = this.getCycleDate();

    return this.prisma.$transaction(async (tx) => {
      // Close out any session still RUNNING from a previous cycle.
      await this.finalizeStaleSessions(tx, simId, cycleDate);

      // Upsert today's usage record.
      const daily = await tx.dailyDataUsage.upsert({
        where: { simId_cycleDate: { simId, cycleDate } },
        create: { simId, planId: plan.id, cycleDate, allowanceMb: allowance, usedMb: 0 },
        update: {},
      });

      if (
        daily.usedMb + daily.bankedMb - daily.redeemedMb >=
        daily.allowanceMb
      ) {
        throw new ApiException(
          400,
          'ALLOWANCE_EXHAUSTED',
          'Daily data allowance is fully used or saved to the Data Bank. Come back tomorrow.',
        );
      }

      // Check for an existing running session via the application layer.
      // The DB partial unique index provides the final concurrency guard.
      const running = await tx.usageSimulation.findFirst({
        where: { simId, status: 'RUNNING' },
      });
      if (running) {
        throw new ApiException(
          409,
          'SESSION_ALREADY_RUNNING',
          'A data usage simulation is already running for this SIM.',
        );
      }

      let session;
      try {
        session = await tx.usageSimulation.create({
          data: {
            simId,
            dailyUsageId: daily.id,
            startUsedMb: daily.usedMb,
            status: 'RUNNING',
          },
        });
      } catch (err) {
        // The partial unique index rejected a concurrent second RUNNING
        // session for this SIM — surface it as a conflict, not a 500.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new ApiException(
            409,
            'SESSION_ALREADY_RUNNING',
            'A data usage simulation is already running for this SIM.',
          );
        }
        throw err;
      }

      this.logger.log(`Started usage session ${session.id} for SIM ${simId}`);

      return {
        sessionId: session.id,
        allowanceMb: daily.allowanceMb,
        usedMb: daily.usedMb,
        bankedMb: daily.bankedMb,
        redeemedMb: daily.redeemedMb,
        remainingMb:
          daily.allowanceMb -
          daily.usedMb -
          daily.bankedMb +
          daily.redeemedMb,
        running: true,
        sessionStartedAt: session.startedAt,
        simulatedRateMbPerSecond: RATE_MB_PER_SECOND,
      };
    });
  }

  /**
   * Return the current usage status for today's cycle without mutating state.
   * If a session is RUNNING, the `usedMb` is computed live from elapsed time
   * so the frontend can update its display in real time using only this endpoint.
   */
  async getStatus(simId: string, userId: string) {
    const { allowance } = await this.getEligibleSim(simId, userId);
    const cycleDate = this.getCycleDate();

    const daily = await this.prisma.dailyDataUsage.findUnique({
      where: { simId_cycleDate: { simId, cycleDate } },
      include: {
        simulations: {
          where: { status: 'RUNNING' },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    // No usage record yet — fresh day or first use.
    if (!daily) {
      return {
        allowanceMb: allowance,
        usedMb: 0,
        bankedMb: 0,
        redeemedMb: 0,
        remainingMb: allowance,
        running: false,
        sessionStartedAt: null,
        simulatedRateMbPerSecond: RATE_MB_PER_SECOND,
      };
    }

    const session = daily.simulations[0] ?? null;
    // Usable pool = allowance − consumed − banked + redeemed-from-bank.
    const usableMb =
      daily.allowanceMb -
      daily.usedMb -
      daily.bankedMb +
      daily.redeemedMb;
    const liveConsumed = session
      ? this.calculateConsumed(session.startedAt, usableMb)
      : 0;

    const usedMb = Math.min(daily.allowanceMb, daily.usedMb + liveConsumed);

    return {
      allowanceMb: daily.allowanceMb,
      usedMb,
      bankedMb: daily.bankedMb,
      redeemedMb: daily.redeemedMb,
      remainingMb: Math.max(0, usableMb - liveConsumed),
      running: session !== null,
      sessionStartedAt: session?.startedAt ?? null,
      simulatedRateMbPerSecond: RATE_MB_PER_SECOND,
    };
  }

  /**
   * Stop the running simulation session, persist the consumed amount, and
   * return the final usage snapshot.
   */
  async stop(simId: string, userId: string) {
    await this.getEligibleSim(simId, userId);
    const cycleDate = this.getCycleDate();

    return this.prisma.$transaction(async (tx) => {
      await this.finalizeStaleSessions(tx, simId, cycleDate);

      const daily = await tx.dailyDataUsage.findUnique({
        where: { simId_cycleDate: { simId, cycleDate } },
      });

      if (!daily) {
        throw new ApiException(
          400,
          'NO_USAGE_RECORD',
          'No usage record found for today. Start a simulation first.',
        );
      }

      const session = await tx.usageSimulation.findFirst({
        where: { simId, dailyUsageId: daily.id, status: 'RUNNING' },
        orderBy: { startedAt: 'desc' },
      });

      if (!session) {
        throw new ApiException(
          400,
          'NO_RUNNING_SESSION',
          'No running simulation found for this SIM.',
        );
      }

      // Banked data is gone from the pool; redeemed data adds back to it.
      const consumedMb = this.calculateConsumed(
        session.startedAt,
        daily.allowanceMb -
          daily.usedMb -
          daily.bankedMb +
          daily.redeemedMb,
      );

      const newUsedMb = Math.min(daily.allowanceMb, daily.usedMb + consumedMb);
      const exhausted =
        newUsedMb + daily.bankedMb - daily.redeemedMb >=
        daily.allowanceMb;

      await tx.dailyDataUsage.update({
        where: { id: daily.id },
        data: { usedMb: newUsedMb },
      });

      await tx.usageSimulation.update({
        where: { id: session.id },
        data: {
          status: exhausted ? 'COMPLETED' : 'STOPPED',
          stoppedAt: new Date(),
          consumedMb,
        },
      });

      this.logger.log(
        `Stopped usage session ${session.id} for SIM ${simId}: ` +
          `consumed ${consumedMb} MB, total today ${newUsedMb}/${daily.allowanceMb} MB`,
      );

      return {
        running: false,
        allowanceMb: daily.allowanceMb,
        usedMb: newUsedMb,
        bankedMb: daily.bankedMb,
        redeemedMb: daily.redeemedMb,
        remainingMb:
          daily.allowanceMb - newUsedMb - daily.bankedMb + daily.redeemedMb,
        consumedThisSession: consumedMb,
        exhausted,
        simulatedRateMbPerSecond: RATE_MB_PER_SECOND,
      };
    });
  }
}
