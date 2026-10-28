import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { XpLevelService } from './xp-level.service.js';
import type { QuestFrequency, QuestMetric } from '../generated/prisma/enums.js';

const TIME_ZONE = 'Asia/Kolkata';

interface DefaultQuestSeed {
  title: string;
  description: string;
  metric: QuestMetric;
  frequency: QuestFrequency;
  targetValue: number;
  xpReward: number;
}

const DEFAULT_QUESTS: DefaultQuestSeed[] = [
  {
    title: 'Save 500 MB',
    description: 'Save unused data into your Data Bank today',
    metric: 'DATA_BANK_SAVED_MB',
    frequency: 'DAILY',
    targetValue: 500,
    xpReward: 100,
  },
  {
    title: 'Send data to a friend',
    description: 'Transfer data to any friend or family member',
    metric: 'DATA_TRANSFERRED_MB',
    frequency: 'DAILY',
    targetValue: 100,
    xpReward: 75,
  },
  {
    title: 'Use Data Bank',
    description: 'Redeem stored data from your Data Bank into today’s usage pool',
    metric: 'DATA_BANK_REDEEMED_MB',
    frequency: 'DAILY',
    targetValue: 100,
    xpReward: 50,
  },
  {
    title: 'Daily Check-in',
    description: 'Check in to the Zylo App and inspect your connection',
    metric: 'DAILY_CHECK_IN',
    frequency: 'DAILY',
    targetValue: 1,
    xpReward: 25,
  },
  {
    title: '7 Day Streak',
    description: 'Maintain an uninterrupted 7-day activity streak',
    metric: 'STREAK_DAYS',
    frequency: 'WEEKLY',
    targetValue: 7,
    xpReward: 200,
  },
];

@Injectable()
export class QuestService implements OnApplicationBootstrap {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpLevelService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaultQuests();
  }

  /**
   * Seed default quest catalog matching the Zylo Quest architecture diagram.
   */
  async seedDefaultQuests() {
    for (const q of DEFAULT_QUESTS) {
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
            isActive: true,
          },
        });
      }
    }
  }

  /**
   * Calculates the start and end of the daily cycle for Asia/Kolkata timezone.
   */
  getDailyCycleRange(date = new Date()): { start: Date; end: Date } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)!.value;
    const dateStr = `${get('year')}-${get('month')}-${get('day')}`;

    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);
    return { start, end };
  }

  /**
   * Ensures the user has active UserQuest records for today's active quests.
   * If not present, creates them lazily.
   */
  async ensureDailyQuestsAssigned(userId: string) {
    const { start: periodStart, end: periodEnd } = this.getDailyCycleRange();

    const activeQuests = await this.prisma.quest.findMany({
      where: { isActive: true },
    });

    for (const quest of activeQuests) {
      await this.prisma.userQuest.upsert({
        where: {
          userId_questId_periodStart: {
            userId,
            questId: quest.id,
            periodStart,
          },
        },
        create: {
          userId,
          questId: quest.id,
          periodStart,
          periodEnd,
          progress: 0,
          status: 'IN_PROGRESS',
        },
        update: {},
      });
    }
  }

  /**
   * Returns complete Quest Board data for the user:
   * Profile with Level/XP/Streaks, Active Quests, Completed Quests, Badges, and XP history.
   */
  async getUserQuestBoard(userId: string) {
    await this.ensureDailyQuestsAssigned(userId);

    const { start: todayStart } = this.getDailyCycleRange();

    const [profileRaw, userQuests, achievements, xpHistory] = await Promise.all([
      this.xpService.getOrCreateProfile(userId),
      this.prisma.userQuest.findMany({
        where: {
          userId,
          periodStart: { gte: todayStart },
        },
        include: { quest: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
      }),
      this.prisma.xpLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const levelInfo = this.xpService.calculateLevel(profileRaw.totalXp);

    const activeQuests = userQuests
      .filter((uq) => uq.status === 'IN_PROGRESS')
      .map((uq) => ({
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
        periodEnd: uq.periodEnd,
      }));

    const completedQuests = userQuests
      .filter((uq) => uq.status === 'COMPLETED')
      .map((uq) => ({
        id: uq.id,
        questId: uq.quest.id,
        title: uq.quest.title,
        description: uq.quest.description,
        progress: uq.progress,
        targetValue: uq.quest.targetValue,
        xpReward: uq.quest.xpReward,
        completedAt: uq.completedAt,
      }));

    return {
      profile: {
        ...levelInfo,
        streakDays: profileRaw.streakDays,
        lastActiveDate: profileRaw.lastActiveDate,
      },
      stats: {
        activeQuestCount: activeQuests.length,
        completedQuestCount: completedQuests.length,
        badgesUnlockedCount: achievements.length,
      },
      activeQuests,
      completedQuests,
      badges: achievements.map((ua) => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        badgeTier: ua.achievement.badgeTier,
        iconUrl: ua.achievement.iconUrl,
        xpReward: ua.achievement.xpReward,
        unlockedAt: ua.unlockedAt,
      })),
      recentXpLedger: xpHistory.map((item) => ({
        id: item.id,
        source: item.source,
        xpAmount: item.xpAmount,
        description: item.description,
        createdAt: item.createdAt,
      })),
    };
  }
}
