import { Injectable, Logger, OnApplicationBootstrap, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { XpLevelService } from './xp-level.service.js';
import { QuestRulesEngine } from './quest-rules.engine.js';
import type { QuestFrequency, QuestMetric, RewardType } from '../generated/prisma/enums.js';

const TIME_ZONE = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

interface DefaultQuestSeed {
  title: string;
  description: string;
  metric: QuestMetric;
  frequency: QuestFrequency;
  targetValue: number;
  xpReward: number;
  weekNumber: number;
}

const DEFAULT_WEEKLY_QUESTS: DefaultQuestSeed[] = [
  // Week 1 Quests (Target: ~250 XP total)
  {
    title: 'Week 1: Welcome Check-in',
    description: 'Check in to the Zylo App 3 days this week',
    metric: 'DAILY_CHECK_IN',
    frequency: 'WEEKLY',
    targetValue: 3,
    xpReward: 75,
    weekNumber: 1,
  },
  {
    title: 'Week 1: Data Saver Initiate',
    description: 'Save at least 300 MB of unused data into your Data Bank',
    metric: 'DATA_BANK_SAVED_MB',
    frequency: 'WEEKLY',
    targetValue: 300,
    xpReward: 100,
    weekNumber: 1,
  },
  {
    title: 'Week 1: P2P Data Share',
    description: 'Transfer 100 MB data to a friend or family member',
    metric: 'DATA_TRANSFERRED_MB',
    frequency: 'WEEKLY',
    targetValue: 100,
    xpReward: 75,
    weekNumber: 1,
  },

  // Week 2 Quests (Target: ~250 XP total)
  {
    title: 'Week 2: Mid-Plan Momentum',
    description: 'Maintain a 4-day check-in streak this week',
    metric: 'DAILY_CHECK_IN',
    frequency: 'WEEKLY',
    targetValue: 4,
    xpReward: 100,
    weekNumber: 2,
  },
  {
    title: 'Week 2: Vault Builder',
    description: 'Save 600 MB of data to prevent daily expiration',
    metric: 'DATA_BANK_SAVED_MB',
    frequency: 'WEEKLY',
    targetValue: 600,
    xpReward: 100,
    weekNumber: 2,
  },
  {
    title: 'Week 2: Smart Vault Redemption',
    description: 'Redeem at least 150 MB from your Data Bank into today’s usage',
    metric: 'DATA_BANK_REDEEMED_MB',
    frequency: 'WEEKLY',
    targetValue: 150,
    xpReward: 50,
    weekNumber: 2,
  },

  // Week 3 Quests (Target: ~250 XP total)
  {
    title: 'Week 3: Consistency Champion',
    description: 'Check in for 5 days during week 3',
    metric: 'DAILY_CHECK_IN',
    frequency: 'WEEKLY',
    targetValue: 5,
    xpReward: 100,
    weekNumber: 3,
  },
  {
    title: 'Week 3: Community Sharer',
    description: 'Transfer 250 MB data to another Zylo subscriber',
    metric: 'DATA_TRANSFERRED_MB',
    frequency: 'WEEKLY',
    targetValue: 250,
    xpReward: 100,
    weekNumber: 3,
  },
  {
    title: 'Week 3: Big Vault Deposit',
    description: 'Deposit 1,000 MB total into your Data Bank',
    metric: 'DATA_BANK_SAVED_MB',
    frequency: 'WEEKLY',
    targetValue: 1000,
    xpReward: 100,
    weekNumber: 3,
  },

  // Week 4 Quests (Target: ~250 XP total)
  {
    title: 'Week 4: Zero Waste Hero',
    description: 'Save 1,500 MB unused data before your plan renews',
    metric: 'DATA_BANK_SAVED_MB',
    frequency: 'WEEKLY',
    targetValue: 1500,
    xpReward: 125,
    weekNumber: 4,
  },
  {
    title: 'Week 4: Plan Completionist',
    description: 'Complete 5 daily check-ins in the final week',
    metric: 'DAILY_CHECK_IN',
    frequency: 'WEEKLY',
    targetValue: 5,
    xpReward: 100,
    weekNumber: 4,
  },
  {
    title: 'Week 4: Generosity Bonus',
    description: 'Send 500 MB data to any friend in need',
    metric: 'DATA_TRANSFERRED_MB',
    frequency: 'WEEKLY',
    targetValue: 500,
    xpReward: 75,
    weekNumber: 4,
  },
];

interface DefaultVoucherSeed {
  name: string;
  description: string;
  type: RewardType;
  requiredXp: number;
  valueMb?: number;
  discountPaise?: number;
  minPurchasePaise?: number;
  badgeCode?: string;
}

const DEFAULT_VOUCHERS: DefaultVoucherSeed[] = [
  // 1. Data Vouchers
  {
    name: '500 MB Data Booster',
    description: 'Instant 500 MB high-speed bonus data credited straight into your Data Bank.',
    type: 'DATA_MB',
    requiredXp: 200,
    valueMb: 500,
  },
  {
    name: '1 GB Mega Booster',
    description: '1 GB bonus data deposited directly into your Data Bank vault with 30-day rollover.',
    type: 'DATA_MB',
    requiredXp: 350,
    valueMb: 1024,
  },
  {
    name: '2.5 GB Super Vault Pack',
    description: '2.5 GB heavy data credit for binge streaming and downloading.',
    type: 'DATA_MB',
    requiredXp: 600,
    valueMb: 2560,
  },

  // 2. Recharge Discount Vouchers
  {
    name: '₹20 Recharge Discount',
    description: 'Save ₹20 instantly on your next mobile plan recharge of ₹199 or more.',
    type: 'COUPON',
    requiredXp: 300,
    discountPaise: 2000,
    minPurchasePaise: 19900,
  },
  {
    name: '₹50 Recharge Discount',
    description: 'Save ₹50 on any plan recharge of ₹299 or more. Valid for 30 days.',
    type: 'COUPON',
    requiredXp: 500,
    discountPaise: 5000,
    minPurchasePaise: 29900,
  },
  {
    name: '₹100 Grand Recharge Coupon',
    description: 'Exclusive ₹100 discount coupon for next cycle plan recharge.',
    type: 'COUPON',
    requiredXp: 800,
    discountPaise: 10000,
  },

  // 3. Permanent Profile Badges
  {
    name: 'Level 1: Rookie Saver Badge',
    description: 'Permanent profile badge recognizing your initial steps into smart data saving.',
    type: 'BADGE',
    requiredXp: 150,
    badgeCode: 'LEVEL_1_ROOKIE',
  },
  {
    name: 'Level 2: Data Explorer Badge',
    description: 'Permanent prestige badge displayed on your profile avatar.',
    type: 'BADGE',
    requiredXp: 500,
    badgeCode: 'LEVEL_2_DATA_EXPLORER',
  },
  {
    name: 'Level 3: Cyber Master Badge',
    description: 'Elite glowing cosmetic badge highlighting high-tier quest mastery.',
    type: 'BADGE',
    requiredXp: 750,
    badgeCode: 'LEVEL_3_CYBER_MASTER',
  },
  {
    name: 'Diamond VIP Saver Badge',
    description: 'Supreme diamond profile crown unlocked only by dedicated quest legends.',
    type: 'BADGE',
    requiredXp: 950,
    badgeCode: 'DIAMOND_VIP_SAVER',
  },
];

@Injectable()
export class QuestService implements OnApplicationBootstrap {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpLevelService,
    @Optional() private readonly rulesEngine?: QuestRulesEngine,
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaultQuestsAndVouchers();
  }

  /**
   * Seed default weekly quests and reward vouchers catalog.
   */
  async seedDefaultQuestsAndVouchers() {
    // 1. Quests
    for (const q of DEFAULT_WEEKLY_QUESTS) {
      const existing = await this.prisma.quest.findFirst({
        where: { title: q.title },
      });
      if (!existing) {
        await this.prisma.quest.create({
          data: {
            title: q.title,
            description: q.description,
            metric: q.metric,
            frequency: q.frequency,
            targetValue: q.targetValue,
            xpReward: q.xpReward,
            weekNumber: q.weekNumber,
            isActive: true,
          },
        });
      }
    }

    // 2. Vouchers in RewardCatalog — upsert so changed defaults (e.g.
    // minPurchasePaise) reach existing installs too.
    for (const v of DEFAULT_VOUCHERS) {
      await this.prisma.rewardCatalog.upsert({
        where: { name: v.name },
        create: {
          name: v.name,
          description: v.description,
          type: v.type,
          requiredXp: v.requiredXp,
          valueMb: v.valueMb ?? null,
          discountPaise: v.discountPaise ?? null,
          minPurchasePaise: v.minPurchasePaise ?? null,
          badgeCode: v.badgeCode ?? null,
          isActive: true,
        },
        update: { minPurchasePaise: v.minPurchasePaise ?? null },
      });
    }
  }

  /**
   * Helper to retrieve active plan subscription for a user.
   */
  async getActivePlanSubscription(userId: string) {
    const activeSub = await this.prisma.planSubscription.findFirst({
      where: {
        sim: { userId },
        status: 'ACTIVE',
      },
      include: {
        plan: true,
        sim: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return activeSub;
  }

  /**
   * Synchronizes user's pack cycle:
   * - If plan has expired: spendable pack XP drops to 0 (resets to 0!). Badges persist.
   * - If new plan detected: resets spendable XP to 0 and seeds weekly quests for all weeks.
   */
  async syncUserPackCycle(userId: string) {
    const profile = await this.xpService.getOrCreateProfile(userId);
    const activeSub = await this.getActivePlanSubscription(userId);
    const now = new Date();

    // Case 1: No active plan
    if (!activeSub) {
      if (profile.activePlanSubId || profile.spendablePackXp > 0) {
        await this.prisma.userGameProfile.update({
          where: { id: profile.id },
          data: {
            spendablePackXp: 0,
            activePlanSubId: null,
            packExpiryDate: null,
          },
        });
        this.logger.log(`User ${userId} has no active plan. Spendable pack XP reset to 0.`);
      }
      return { profile, activeSub: null, totalWeeks: 4, currentWeek: 1, isPlanActive: false };
    }

    const { startDate, endDate, plan } = activeSub;
    const planValidityDays = plan.validityDays ?? 28;
    const totalWeeks = Math.max(1, Math.ceil(planValidityDays / 7));

    // Case 2: Plan has expired
    if (endDate && endDate < now) {
      if (profile.activePlanSubId === activeSub.id && profile.spendablePackXp > 0) {
        await this.prisma.userGameProfile.update({
          where: { id: profile.id },
          data: {
            spendablePackXp: 0,
            activePlanSubId: null,
            packExpiryDate: endDate,
          },
        });
        this.logger.log(
          `Plan ${activeSub.id} expired for user ${userId}. Spendable XP reset to 0. Badges preserved: ${profile.unlockedBadges.join(', ')}`,
        );
      }
      return { profile, activeSub, totalWeeks, currentWeek: totalWeeks, isPlanActive: false };
    }

    // Case 3: Brand new plan activation or cycle transition
    const isNewPlanCycle = profile.activePlanSubId !== activeSub.id;
    let updatedProfile = profile;

    if (isNewPlanCycle) {
      updatedProfile = await this.prisma.userGameProfile.update({
        where: { id: profile.id },
        data: {
          activePlanSubId: activeSub.id,
          spendablePackXp: 0, // Starts fresh at 0 for new pack
          packTotalEarned: 0,
          packTotalWeeks: totalWeeks,
          packStartDate: startDate ?? now,
          packExpiryDate: endDate ?? new Date(now.getTime() + planValidityDays * DAY_MS),
        },
      });
      this.logger.log(
        `Initialized new ${planValidityDays}-day plan (${totalWeeks} weeks) for user ${userId}. Spendable XP reset to 0.`,
      );
    }

    // Ensure weekly quests exist for all weeks of this plan
    await this.ensureWeeklyQuestsForPlan(
      userId,
      activeSub.id,
      startDate ?? now,
      endDate ?? new Date(now.getTime() + planValidityDays * DAY_MS),
      totalWeeks,
    );

    // Compute current week in cycle
    const effectiveStart = startDate ?? now;
    const elapsedDays = Math.max(0, Math.floor((now.getTime() - effectiveStart.getTime()) / DAY_MS));
    const currentWeek = Math.min(totalWeeks, Math.max(1, Math.floor(elapsedDays / 7) + 1));

    return {
      profile: updatedProfile,
      activeSub,
      totalWeeks,
      currentWeek,
      isPlanActive: true,
    };
  }

  /**
   * Lazily populates weekly quests for each week of the active plan duration.
   */
  async ensureWeeklyQuestsForPlan(
    userId: string,
    planSubId: string,
    startDate: Date,
    endDate: Date,
    totalWeeks: number,
  ) {
    // Template quests from database
    const templateQuests = await this.prisma.quest.findMany({
      where: { isActive: true },
    });

    if (templateQuests.length === 0) return;

    for (let w = 1; w <= totalWeeks; w++) {
      const weekStart = new Date(startDate.getTime() + (w - 1) * 7 * DAY_MS);
      const weekEnd = new Date(Math.min(endDate.getTime(), startDate.getTime() + w * 7 * DAY_MS));

      // Match template quests for this week modulo 4
      const templateWeekNum = ((w - 1) % 4) + 1;
      const matchingTemplates = templateQuests.filter(
        (q) => q.weekNumber === templateWeekNum,
      );

      // Fallback if none specifically tagged for this week
      const questsToAssign = matchingTemplates.length > 0 ? matchingTemplates : templateQuests.slice(0, 3);

      for (const quest of questsToAssign) {
        await this.prisma.userQuest.upsert({
          where: {
            userId_questId_periodStart: {
              userId,
              questId: quest.id,
              periodStart: weekStart,
            },
          },
          create: {
            userId,
            questId: quest.id,
            planSubId,
            weekNumber: w,
            periodStart: weekStart,
            periodEnd: weekEnd,
            progress: 0,
            status: 'IN_PROGRESS',
          },
          update: {
            planSubId,
            weekNumber: w,
            periodEnd: weekEnd,
          },
        });
      }
    }
  }

  /**
   * Returns complete Quest Board data tailored to user's active pack cycle:
   * - Plan summary & days remaining
   * - Spendable XP wallet (currency) & Pack Total Earned
   * - Permanent Badges & Level
   * - Weekly Quests grouped by Week (Week 1..Week N) with status (active, locked, completed)
   * - Redeemable Vouchers Marketplace with affordability check
   * - User's redeemed vouchers wallet
   */
  async getUserQuestBoard(userId: string) {
    if (this.rulesEngine) {
      try {
        await this.rulesEngine.triggerDailyCheckIn(userId);
      } catch (err) {
        this.logger.warn(
          `Auto check-in on quest board access failed for user ${userId}: ${err}`,
        );
      }
    }

    const { profile, activeSub, totalWeeks, currentWeek, isPlanActive } =
      await this.syncUserPackCycle(userId);

    const now = new Date();

    // 1. Fetch user's quests for this active plan
    const userQuests = await this.prisma.userQuest.findMany({
      where: {
        userId,
        ...(activeSub ? { planSubId: activeSub.id } : {}),
      },
      include: { quest: true },
      orderBy: [{ weekNumber: 'asc' }, { createdAt: 'asc' }],
    });

    // 2. Fetch vouchers catalog
    const vouchersCatalog = await this.prisma.rewardCatalog.findMany({
      where: { isActive: true },
      orderBy: { requiredXp: 'asc' },
    });

    // 3. Fetch user's redeemed vouchers
    const redemptions = await this.prisma.rewardRedemption.findMany({
      where: { userId },
      include: { reward: true },
      orderBy: { redeemedAt: 'desc' },
      take: 20,
    });

    // Group quests by week
    const weeksData = [];
    for (let w = 1; w <= totalWeeks; w++) {
      const questsInWeek = userQuests.filter((uq) => uq.weekNumber === w);
      const isWeekLocked = w > currentWeek;
      const isWeekCurrent = w === currentWeek;
      const allCompleted = questsInWeek.length > 0 && questsInWeek.every((q) => q.status === 'COMPLETED');

      weeksData.push({
        weekNumber: w,
        label: `Week ${w}`,
        isCurrent: isWeekCurrent,
        isLocked: isWeekLocked,
        isCompleted: allCompleted,
        quests: questsInWeek.map((uq) => ({
          id: uq.id,
          questId: uq.quest.id,
          title: uq.quest.title,
          description: uq.quest.description,
          metric: uq.quest.metric,
          progress: uq.progress,
          targetValue: uq.quest.targetValue,
          progressPercent: Math.min(
            100,
            Math.round((uq.progress / uq.quest.targetValue) * 100),
          ),
          xpReward: uq.quest.xpReward,
          status: uq.status,
          isCompleted: uq.status === 'COMPLETED',
          completedAt: uq.completedAt,
        })),
      });
    }

    const daysRemaining = activeSub?.endDate
      ? Math.max(0, Math.ceil((activeSub.endDate.getTime() - now.getTime()) / DAY_MS))
      : 0;

    const spendableXp = profile.spendablePackXp ?? 0;

    return {
      planInfo: {
        isPlanActive,
        planName: activeSub?.plan.name ?? 'No Active Plan',
        validityDays: activeSub?.plan.validityDays ?? 0,
        totalWeeks,
        currentWeek,
        startDate: activeSub?.startDate ?? null,
        endDate: activeSub?.endDate ?? null,
        daysRemaining,
      },
      wallet: {
        spendablePackXp: spendableXp,
        packTotalEarned: profile.packTotalEarned ?? 0,
        packTargetXp: totalWeeks * 250, // e.g. 1000 for 4 weeks, 3000 for 12 weeks
      },
      profile: {
        level: profile.level,
        streakDays: profile.streakDays,
        unlockedBadges: profile.unlockedBadges ?? ['LEVEL_1_ROOKIE'],
        lastActiveDate: profile.lastActiveDate,
        checkedInToday: profile.lastActiveDate
          ? (this.rulesEngine
              ? this.rulesEngine.getKolkataDateString(profile.lastActiveDate) ===
                this.rulesEngine.getKolkataDateString()
              : true)
          : false,
      },
      weeks: weeksData,
      vouchers: vouchersCatalog.map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        type: v.type,
        requiredXp: v.requiredXp,
        valueMb: v.valueMb,
        discountPaise: v.discountPaise,
        badgeCode: v.badgeCode,
        canAfford: spendableXp >= v.requiredXp,
        isBadgeOwned: v.badgeCode ? (profile.unlockedBadges ?? []).includes(v.badgeCode) : false,
      })),
      myRedemptions: redemptions.map((r) => ({
        id: r.id,
        name: r.reward.name,
        type: r.reward.type,
        couponCode: r.couponCode,
        valueMb: r.valueMb,
        discountPaise: r.discountPaise,
        badgeCode: r.badgeCode,
        redeemedAt: r.redeemedAt,
        expiresAt: r.expiresAt,
        isUsed: r.isUsed,
      })),
    };
  }

  /**
   * Redaction/Redemption of a Voucher using Spendable Pack XP:
   * 1. Verifies spendable pack XP >= required XP.
   * 2. Atomically decrements spendablePackXp.
   * 3. Fulfills reward (Data Bank deposit, Coupon code generation, or Badge grant).
   */
  async redeemVoucher(userId: string, voucherId: string) {
    const voucher = await this.prisma.rewardCatalog.findUnique({
      where: { id: voucherId },
    });

    if (!voucher || !voucher.isActive) {
      throw new NotFoundException('Voucher not found or no longer active');
    }

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.userGameProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        throw new NotFoundException('User game profile not found');
      }

      const currentSpendable = profile.spendablePackXp ?? 0;
      if (currentSpendable < voucher.requiredXp) {
        throw new BadRequestException(
          `Insufficient spendable XP. Required: ${voucher.requiredXp} XP, Available: ${currentSpendable} XP.`,
        );
      }

      // 1. Decrement spendable pack XP
      const newSpendable = currentSpendable - voucher.requiredXp;

      // 2. Generate reward fulfillment
      let couponCode: string | null = null;
      let expiresAt: Date | null = null;
      const currentBadges = new Set(profile.unlockedBadges || []);

      if (voucher.type === 'DATA_MB' && voucher.valueMb) {
        // Deposit directly to active SIM's Data Bank
        const activeSim = await tx.sim.findFirst({
          where: { userId, status: 'ACTIVE' },
        });

        if (!activeSim) {
          // Never burn XP without delivering the data.
          throw new BadRequestException(
            'No active Zylo SIM found — activate a SIM before redeeming data rewards.',
          );
        }

        const account = await tx.dataBankAccount.upsert({
          where: { simId: activeSim.id },
          create: { simId: activeSim.id, balanceMb: voucher.valueMb },
          update: { balanceMb: { increment: voucher.valueMb } },
        });

        await tx.dataBankTransaction.create({
          data: {
            dataBankId: account.id,
            type: 'DEPOSIT',
            amountMb: voucher.valueMb,
            // account.balanceMb already includes the deposit.
            balanceAfterMb: account.balanceMb,
            description: `Quest Voucher Reward: ${voucher.name}`,
            expiresAt: new Date(Date.now() + 30 * DAY_MS),
          },
        });

        this.logger.log(`Deposited ${voucher.valueMb} MB into Data Bank for user ${userId}`);
      } else if (voucher.type === 'COUPON') {
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        couponCode = `ZYLO-${rand}`;
        expiresAt = new Date(Date.now() + 30 * DAY_MS); // 30-day coupon validity
      } else if (voucher.type === 'BADGE' && voucher.badgeCode) {
        currentBadges.add(voucher.badgeCode);
      }

      // 3. Update UserGameProfile
      await tx.userGameProfile.update({
        where: { id: profile.id },
        data: {
          spendablePackXp: newSpendable,
          currentXp: newSpendable,
          unlockedBadges: Array.from(currentBadges),
        },
      });

      // 4. Record redemption
      const redemption = await tx.rewardRedemption.create({
        data: {
          userId,
          rewardId: voucher.id,
          status: 'SUCCESS',
          couponCode,
          discountPaise: voucher.discountPaise,
          valueMb: voucher.valueMb,
          badgeCode: voucher.badgeCode,
          expiresAt,
        },
      });

      // 5. Ledger record
      await tx.xpLedger.create({
        data: {
          userId,
          source: 'BONUS',
          sourceId: redemption.id,
          xpAmount: -voucher.requiredXp,
          description: `Redeemed voucher: ${voucher.name} (-${voucher.requiredXp} XP)`,
        },
      });

      this.logger.log(
        `User ${userId} redeemed ${voucher.name}. XP spent: ${voucher.requiredXp}. Remaining XP: ${newSpendable}`,
      );

      return {
        success: true,
        voucherName: voucher.name,
        type: voucher.type,
        spentXp: voucher.requiredXp,
        remainingSpendableXp: newSpendable,
        couponCode,
        expiresAt,
        valueMb: voucher.valueMb,
        badgeCode: voucher.badgeCode,
      };
    });
  }
}
