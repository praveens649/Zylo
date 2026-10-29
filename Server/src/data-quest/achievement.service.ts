import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { XpLevelService } from './xp-level.service.js';
import type { UnlockedBadge } from './data-quest.types.js';

interface SeedAchievement {
  name: string;
  description: string;
  badgeTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  conditionType: string;
  conditionValue: number;
  xpReward: number;
  iconUrl?: string;
}

const DEFAULT_ACHIEVEMENTS: SeedAchievement[] = [
  {
    name: 'Data Saver',
    description: 'Save 500 MB of unused data into the Zylo Data Bank',
    badgeTier: 'BRONZE',
    conditionType: 'DATA_SAVED_MB',
    conditionValue: 500,
    xpReward: 100,
    iconUrl: 'badge-data-saver',
  },
  {
    name: 'Data Philanthropist',
    description: 'Send at least 100 MB of data to a friend',
    badgeTier: 'BRONZE',
    conditionType: 'DATA_SENT_MB',
    conditionValue: 100,
    xpReward: 75,
    iconUrl: 'badge-data-share',
  },
  {
    name: 'Vault Master',
    description: 'Save a cumulative total of 5,000 MB in your Data Bank',
    badgeTier: 'SILVER',
    conditionType: 'DATA_SAVED_MB',
    conditionValue: 5000,
    xpReward: 250,
    iconUrl: 'badge-vault-master',
  },
  {
    name: 'Streak Starter',
    description: 'Maintain a 3-day active streak in Zylo Data Quests',
    badgeTier: 'BRONZE',
    conditionType: 'STREAK_DAYS',
    conditionValue: 3,
    xpReward: 100,
    iconUrl: 'badge-streak-3',
  },
  {
    name: 'Consistency King',
    description: 'Maintain a 7-day continuous quest streak',
    badgeTier: 'GOLD',
    conditionType: 'STREAK_DAYS',
    conditionValue: 7,
    xpReward: 200,
    iconUrl: 'badge-streak-7',
  },
  {
    name: 'Quest Novice',
    description: 'Complete your first 3 quests',
    badgeTier: 'BRONZE',
    conditionType: 'QUESTS_COMPLETED',
    conditionValue: 3,
    xpReward: 50,
    iconUrl: 'badge-quest-3',
  },
  {
    name: 'Quest Veteran',
    description: 'Complete 10 Zylo quests',
    badgeTier: 'SILVER',
    conditionType: 'QUESTS_COMPLETED',
    conditionValue: 10,
    xpReward: 150,
    iconUrl: 'badge-quest-10',
  },
];

@Injectable()
export class AchievementService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AchievementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpLevelService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedAchievements();
  }

  /**
   * Seeds default achievements if they do not exist.
   */
  async seedAchievements() {
    for (const ach of DEFAULT_ACHIEVEMENTS) {
      await this.prisma.achievement.upsert({
        where: { name: ach.name },
        create: ach,
        update: {
          description: ach.description,
          conditionType: ach.conditionType,
          conditionValue: ach.conditionValue,
          xpReward: ach.xpReward,
          badgeTier: ach.badgeTier,
        },
      });
    }
  }

  /**
   * Evaluates all locked achievements for a user and unlocks any newly achieved badges.
   */
  async evaluateAchievements(
    userId: string,
    tx?: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<UnlockedBadge[]> {
    const client = tx ?? this.prisma;

    // 1. Fetch user's already unlocked achievement IDs
    const unlocked = await client.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });
    const unlockedIds = new Set(unlocked.map((u) => u.achievementId));

    // 2. Fetch all active achievements
    const allAchievements = await client.achievement.findMany({
      where: { isActive: true },
    });
    const candidates = allAchievements.filter((a) => !unlockedIds.has(a.id));

    if (candidates.length === 0) {
      return [];
    }

    // 3. Compute user's progress metrics
    const [profile, completedQuestsCount, bankDepositAggregate, transferAggregate] =
      await Promise.all([
        this.xpService.getOrCreateProfile(userId, client),
        client.userQuest.count({
          where: { userId, status: 'COMPLETED' },
        }),
        client.dataBankTransaction.aggregate({
          where: {
            dataBank: { sim: { userId } },
            type: 'DEPOSIT',
          },
          _sum: { amountMb: true },
        }),
        client.dataTransfer.aggregate({
          where: {
            fromSim: { userId },
            status: 'COMPLETED',
          },
          _sum: { amountMb: true },
        }),
      ]);

    const totalSavedMb = bankDepositAggregate._sum.amountMb ?? 0;
    const totalSentMb = transferAggregate._sum.amountMb ?? 0;
    const streakDays = profile.streakDays;

    const newlyUnlocked: UnlockedBadge[] = [];

    for (const ach of candidates) {
      let isMet = false;

      switch (ach.conditionType) {
        case 'DATA_SAVED_MB':
          isMet = totalSavedMb >= ach.conditionValue;
          break;
        case 'DATA_SENT_MB':
          isMet = totalSentMb >= ach.conditionValue;
          break;
        case 'STREAK_DAYS':
          isMet = streakDays >= ach.conditionValue;
          break;
        case 'QUESTS_COMPLETED':
          isMet = completedQuestsCount >= ach.conditionValue;
          break;
        case 'LEVEL_REACHED':
          isMet = profile.level >= ach.conditionValue;
          break;
        default:
          break;
      }

      if (isMet) {
        await client.userAchievement.create({
          data: {
            userId,
            achievementId: ach.id,
          },
        });

        // Award achievement XP
        if (ach.xpReward > 0) {
          await this.xpService.awardXp(
            userId,
            ach.xpReward,
            'ACHIEVEMENT',
            ach.id,
            `Unlocked Achievement: ${ach.name}`,
            client,
          );
        }

        this.logger.log(
          `User ${userId} unlocked achievement "${ach.name}" (${ach.badgeTier})!`,
        );

        newlyUnlocked.push({
          id: ach.id,
          name: ach.name,
          description: ach.description,
          badgeTier: ach.badgeTier,
          iconUrl: ach.iconUrl,
          xpAwarded: ach.xpReward,
        });
      }
    }

    return newlyUnlocked;
  }
}
