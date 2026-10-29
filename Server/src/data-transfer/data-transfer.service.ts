import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-error.js';
import { QuestRulesEngine } from '../data-quest/quest-rules.engine.js';
import type { UserModel } from '../generated/prisma/models.js';
import { transferConfig } from './data-transfer.config.js';
import type { SendTransferDto } from './dto.js';

/** Business timezone for the daily sending allowance, same as Data Bank. */
const TIME_ZONE = 'Asia/Kolkata';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

/**
 * P2P data transfers — a customer shares part of TODAY's remaining daily
 * data (unused allowance + redeemed - already banked) with a friend on
 * another Zylo SIM. The sender's daily usage is incremented; the friend gets
 * the MB credited into their Data Bank (transferable → bank rule).
 * Demo scope: balances are application state, not real network quota.
 */
@Injectable()
export class DataTransferService {
  private readonly logger = new Logger(DataTransferService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly questEngine: QuestRulesEngine,
  ) {}

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Today's cycle boundary (00:00 IST) — same rule as the Data Bank. */
  private getCycleDate(date = new Date()): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)!.value;
    return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00.000Z`);
  }

  /** Active plan subscription for a SIM, or null. */
  private async activeSubscription(tx: Tx | PrismaService, simId: string) {
    return tx.planSubscription.findFirst({
      where: {
        simId,
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gt: new Date() },
      },
      include: { plan: true },
      orderBy: { startDate: 'desc' },
    });
  }

  /** The active subscription's plan must allow P2P transfers. */
  private perTransferLimitMb(plan: { transferLimitMb: number | null }) {
    return plan.transferLimitMb ?? transferConfig.maxMb;
  }

  /** MB already sent today by this SIM. */
  private async sentTodayMb(tx: Tx | PrismaService, simId: string) {
    const rows = await tx.dataTransfer.findMany({
      where: {
        fromSimId: simId,
        status: 'COMPLETED',
        completedAt: { gte: this.getCycleDate() },
      },
    });
    return rows.reduce((sum, t) => sum + t.amountMb, 0);
  }

  /**
   * How much of today's pool the customer can still give away:
   * remaining allowance (+ any data redeemed from the bank into today,
   * - whatever was already saved into the bank).
   */
  private shareableMb(
    daily: { allowanceMb: number; usedMb: number; bankedMb: number; redeemedMb: number } | null,
    fallbackAllowanceMb: number,
  ) {
    if (!daily) return fallbackAllowanceMb;
    return Math.max(
      0,
      daily.allowanceMb - daily.usedMb + (daily.redeemedMb ?? 0) - (daily.bankedMb ?? 0),
    );
  }

  // -----------------------------------------------------------------------
  // Overview — the customer's SIMs with transfer eligibility
  // -----------------------------------------------------------------------

  async overview(userId: string) {
    const sims = await this.prisma.sim.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { phoneNumber: { select: { number: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const out = [];
    for (const sim of sims) {
      const [sub, account, daily, sentMb] = await Promise.all([
        this.activeSubscription(this.prisma, sim.id),
        this.prisma.dataBankAccount.findUnique({ where: { simId: sim.id } }),
        this.prisma.dailyDataUsage.findUnique({
          where: {
            simId_cycleDate: { simId: sim.id, cycleDate: this.getCycleDate() },
          },
        }),
        this.sentTodayMb(this.prisma, sim.id),
      ]);
      const enabled = sub?.plan.dataTransferEnabled ?? false;
      out.push({
        simId: sim.id,
        number: sim.phoneNumber.number,
        status: sim.status,
        planName: sub?.plan.name ?? null,
        transferEnabled: !!sub && enabled,
        perTransferLimitMb: sub ? this.perTransferLimitMb(sub.plan) : null,
        /** Today's remaining data — the pool transfers come out of. */
        shareableTodayMb: this.shareableMb(
          daily,
          sub?.plan.dailyDataAllowanceMb ?? 0,
        ),
        bankBalanceMb: account?.balanceMb ?? 0,
        sentTodayMb: sentMb,
        dailyLimitMb: transferConfig.dailyLimitMb,
      });
    }
    return { sims: out };
  }

  // -----------------------------------------------------------------------
  // Friend lookup — exact match only, so numbers cannot be enumerated
  // -----------------------------------------------------------------------

  async lookupRecipient(user: UserModel, number: string) {
    const phone = await this.prisma.phoneNumber.findFirst({
      where: { number: number.trim() },
      include: {
        sim: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    const sim = phone?.sim;

    if (!sim || sim.status !== 'ACTIVE') {
      throw new ApiException(
        404,
        'NUMBER_NOT_FOUND',
        'No active Zylo customer found for that number',
      );
    }
    if (sim.userId === user.id) {
      throw new ApiException(
        400,
        'SELF_TRANSFER',
        "That's your own number — pick a friend instead",
      );
    }
    const sub = await this.activeSubscription(this.prisma, sim.id);
    if (!sub) {
      throw new ApiException(
        400,
        'RECIPIENT_NOT_ELIGIBLE',
        'That customer does not have an active plan right now',
      );
    }

    return {
      recipient: {
        name: sim.user.name,
        number: phone!.number,
        category: sim.category,
      },
    };
  }

  // -----------------------------------------------------------------------
  // Send — atomic debit + credit + ledger + transfer record
  // -----------------------------------------------------------------------

  async send(user: UserModel, dto: SendTransferDto) {
    // Idempotent replay: same key returns the original transfer.
    if (dto.idempotencyKey) {
      const existing = await this.prisma.dataTransfer.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        if (existing.fromSimId !== dto.simId || existing.amountMb !== dto.amountMb) {
          throw new ApiException(
            409,
            'IDEMPOTENCY_CONFLICT',
            'This idempotency key was already used for a different transfer',
          );
        }
        return { transfer: existing, replayed: true };
      }
    }

    // Sender SIM must be owned + ACTIVE.
    const sim = await this.prisma.sim.findFirst({
      where: { id: dto.simId, userId: user.id, status: 'ACTIVE' },
      include: { phoneNumber: { select: { number: true } } },
    });
    if (!sim) {
      throw new ApiException(
        404,
        'SIM_NOT_FOUND',
        'Active SIM not found or does not belong to this account.',
      );
    }

    const sub = await this.activeSubscription(this.prisma, sim.id);
    if (!sub) {
      throw new ApiException(
        400,
        'NO_ACTIVE_PLAN',
        'This SIM has no active plan. Please recharge first.',
      );
    }
    if (!sub.plan.dataTransferEnabled) {
      throw new ApiException(
        400,
        'TRANSFER_NOT_ENABLED',
        `The ${sub.plan.name} plan does not allow data transfers.`,
      );
    }
    if (sub.plan.dailyDataAllowanceMb == null || sub.plan.dailyDataAllowanceMb <= 0) {
      throw new ApiException(
        400,
        'NO_DAILY_ALLOWANCE',
        'The active plan has no daily data allowance to share from.',
      );
    }

    // Per-transfer + minimum checks.
    const limit = this.perTransferLimitMb(sub.plan);
    if (dto.amountMb < transferConfig.minMb) {
      throw new ApiException(
        400,
        'AMOUNT_TOO_SMALL',
        `Transfers start at ${transferConfig.minMb} MB.`,
      );
    }
    if (dto.amountMb > limit) {
      throw new ApiException(
        400,
        'TRANSFER_LIMIT_EXCEEDED',
        `Your plan allows up to ${limit} MB per transfer.`,
      );
    }

    // Recipient must be an ACTIVE Zylo SIM on another customer's account with
    // an active plan — validated exactly like a gift recharge lookup.
    const phone = await this.prisma.phoneNumber.findFirst({
      where: { number: dto.targetNumber.trim() },
      include: { sim: { include: { user: { select: { id: true, name: true } } } } },
    });
    const recipient = phone?.sim;
    if (!recipient || recipient.status !== 'ACTIVE') {
      throw new ApiException(
        404,
        'NUMBER_NOT_FOUND',
        'No active Zylo customer found for that number',
      );
    }
    if (recipient.userId === user.id) {
      throw new ApiException(
        400,
        'SELF_TRANSFER',
        "That's your own number — pick a friend instead",
      );
    }
    if (!(await this.activeSubscription(this.prisma, recipient.id))) {
      throw new ApiException(
        400,
        'RECIPIENT_NOT_ELIGIBLE',
        'That customer does not have an active plan right now',
      );
    }

    // Daily sending allowance.
    const sentMb = await this.sentTodayMb(this.prisma, sim.id);
    if (sentMb + dto.amountMb > transferConfig.dailyLimitMb) {
      throw new ApiException(
        400,
        'DAILY_LIMIT_EXCEEDED',
        `Daily transfer limit is ${transferConfig.dailyLimitMb} MB — you have already sent ${sentMb} MB today.`,
      );
    }

    const transfer = await this.prisma.$transaction(async (tx) => {
      const cycleDate = this.getCycleDate();

      // Today's usage — the shareable pool. Create an unused row so a send
      // works even on days the customer never ran the simulation.
      const daily = await tx.dailyDataUsage.upsert({
        where: {
          simId_cycleDate: { simId: sim.id, cycleDate },
        },
        create: {
          simId: sim.id,
          planId: sub.plan.id,
          cycleDate,
          allowanceMb: sub.plan.dailyDataAllowanceMb!,
          usedMb: 0,
        },
        update: {},
      });

      const shareable = this.shareableMb(daily, daily.allowanceMb);
      if (dto.amountMb > shareable) {
        throw new ApiException(
          400,
          'INSUFFICIENT_DATA',
          `Only ${shareable} MB of today's data is left to share.`,
        );
      }

      // Optimistic spend — a concurrent transfer cannot overspend today's pool.
      const spend = await tx.dailyDataUsage.updateMany({
        where: { id: daily.id, usedMb: daily.usedMb },
        data: { usedMb: { increment: dto.amountMb } },
      });
      if (spend.count === 0) {
        throw new ApiException(
          400,
          'USAGE_CHANGED',
          "Your remaining data changed — please try again.",
        );
      }

      // Credit the friend's Data Bank (created lazily if needed).
      const dest = await tx.dataBankAccount.upsert({
        where: { simId: recipient.id },
        create: { simId: recipient.id, balanceMb: dto.amountMb },
        update: { balanceMb: { increment: dto.amountMb } },
      });

      const created = await tx.dataTransfer.create({
        data: {
          fromSimId: sim.id,
          toSimId: recipient.id,
          amountMb: dto.amountMb,
          message: dto.message ?? null,
          status: 'COMPLETED',
          completedAt: new Date(),
          idempotencyKey: dto.idempotencyKey ?? null,
        },
      });

      await Promise.all([
        // Ledger on the recipient side — their bank balance changed.
        tx.dataBankTransaction.create({
          data: {
            dataBankId: dest.id,
            type: 'TRANSFER_IN',
            amountMb: dto.amountMb,
            balanceAfterMb: dest.balanceMb,
            description: `Received from ${sim.phoneNumber.number}`,
          },
        }),
        tx.notification.create({
          data: {
            userId: recipient.userId,
            title: 'Data received',
            message: `${user.name} sent you ${dto.amountMb} MB — it's in your Data Bank.`,
          },
        }),
        tx.notification.create({
          data: {
            userId: user.id,
            title: 'Data sent',
            message: `${dto.amountMb} MB sent to ${phone!.number} (${recipient.user.name}).`,
          },
        }),
      ]);

      this.logger.log(
        `Transferred ${dto.amountMb} MB from SIM ${sim.id} to ${recipient.id}`,
      );
      return created;
    });

    // Verified quest event — async, deduped by the transfer reference.
    this.questEngine
      .processVerifiedEvent({
        type: 'DATA_SENT',
        userId: user.id,
        amount: dto.amountMb,
        reference: transfer.reference,
      })
      .catch((err) =>
        this.logger.error(`Quest processing error on DATA_SENT: ${err.message}`),
      );

    return { transfer, replayed: false };
  }

  // -----------------------------------------------------------------------
  // History — sent + received for the customer's own SIMs
  // -----------------------------------------------------------------------

  async history(userId: string) {
    const sims = await this.prisma.sim.findMany({
      where: { userId },
      select: { id: true },
    });
    const ids = sims.map((s) => s.id);
    if (ids.length === 0) return { transfers: [] };

    const partyInclude = {
      include: {
        phoneNumber: { select: { number: true } },
        user: { select: { name: true } },
      },
    };

    const [sent, received] = await Promise.all([
      this.prisma.dataTransfer.findMany({
        where: { fromSimId: { in: ids } },
        include: { toSim: partyInclude },
      }),
      this.prisma.dataTransfer.findMany({
        where: { toSimId: { in: ids } },
        include: { fromSim: partyInclude },
      }),
    ]);

    const transfers = [
      ...sent.map((t) => ({
        id: t.id,
        reference: t.reference,
        direction: 'SENT' as const,
        otherParty: { name: (t as any).toSim?.user.name ?? null, number: (t as any).toSim?.phoneNumber.number ?? null },
        amountMb: t.amountMb,
        message: t.message,
        status: t.status,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      })),
      ...received.map((t) => ({
        id: t.id,
        reference: t.reference,
        direction: 'RECEIVED' as const,
        otherParty: { name: (t as any).fromSim?.user.name ?? null, number: (t as any).fromSim?.phoneNumber.number ?? null },
        amountMb: t.amountMb,
        message: t.message,
        status: t.status,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    return { transfers };
  }
}
