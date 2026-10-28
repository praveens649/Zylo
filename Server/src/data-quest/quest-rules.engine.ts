import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { XpLevelService } from './xp-level.service.js';
import { AchievementService } from './achievement.service.js';
import type { QuestMetric } from '../generated/prisma/enums.js';
import type {
  VerifiedQuestEvent,
  QuestEvaluationResult,
  QuestProgressUpdate,
} from './data-quest.types.js';

const TIME_ZONE = 'Asia/Kolkata';

@Injectable()
export class QuestRulesEngine {
  private readonly logger = new Logger(QuestRulesEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpLevelService,
    private readonly achievementService: AchievementService,
  ) {}

  /**
   * Returns current calendar date in Asia/Kolkata timezone at midnight UTC.
   */
  private getKolkataDate(date = new Date()): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)!.value;

    return new Date(
      `${get('year')}-${get('month')}-${get('day')}T00:00:00.000Z`,
    );
  }

  /**
   * Maps backend verified event type to QuestMetric enum in database.
   */
  private mapEventToMetric(eventType: VerifiedQuestEvent['type']): QuestMetric {
    switch (eventType) {
      case 'DATA_SAVED':
        return 'DATA_BANK_SAVED_MB';
      case 'DATA_SENT':
        return 'DATA_TRANSFERRED_MB';
      case 'DATA_REDEEMED':
        return 'DATA_BANK_REDEEMED_MB';
      case 'DAILY_CHECK_IN':
        return 'DAILY_CHECK_IN';
      case 'PLAN_RECHARGED':
        return 'PLAN_RECHARGED';
      default:
        throw new Error(`Unsupported quest event type: ${eventType}`);
    }
  }

  /**
   * Main entrypoint for the Data Quest Rules Engine:
   * Consumes a verified backend event, verifies idempotency, updates matching active quests,
   * advances streaks, triggers XP awards, and evaluates badge unlocks.
   */
  async processVerifiedEvent(
    event: VerifiedQuestEvent,
  ): Promise<QuestEvaluationResult> {
    const { userId, type, amount, reference } = event;
    const targetMetric = this.mapEventToMetric(type);

    return this.prisma.$transaction(async (tx) => {
      // 1. Idempotency Guard: Ensure this event reference hasn't been credited already
      const alreadyProcessed = await tx.xpLedger.findFirst({
        where: {
          userId,
          sourceId: reference,
        },
      });

      const profile = await this.xpService.getOrCreateProfile(userId, tx);

      if (alreadyProcessed) {
        this.logger.warn(
          `Event reference "${reference}" already processed for user ${userId}. Skipping duplicate.`,
        );
        const levelInfo = this.xpService.calculateLevel(profile.totalXp);
        return {
          processed: false,
          alreadyProcessed: true,
          reference,
          updatedQuests: [],
          unlockedAchievements: [],
          profile: {
            ...levelInfo,
            streakDays: profile.streakDays,
            leveledUp: false,
          },
        };
      }

      // 2. Streak Maintenance & Daily Activity Calculation
      const today = this.getKolkataDate();
      let newStreak = profile.streakDays;
      const lastActive = profile.lastActiveDate
        ? new Date(profile.lastActiveDate)
        : null;

      if (!lastActive) {
        newStreak = 1;
      } else {
        const lastActiveDateOnly = this.getKolkataDate(lastActive);
        const diffDays = Math.round(
          (today.getTime() - lastActiveDateOnly.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (diffDays === 1) {
          // Exactly consecutive day
          newStreak = profile.streakDays + 1;
        } else if (diffDays === 0) {
          // Already active today; retain streak
          newStreak = profile.streakDays > 0 ? profile.streakDays : 1;
        } else {
          // Gap > 1 day, streak resets
          newStreak = 1;
        }
      }

      await tx.userGameProfile.update({
        where: { id: profile.id },
        data: {
          streakDays: newStreak,
          lastActiveDate: today,
        },
      });

      // 3. Match User's Active In-Progress Quests for this metric
      const now = new Date();
      const activeUserQuests = await tx.userQuest.findMany({
        where: {
          userId,
          status: 'IN_PROGRESS',
          periodEnd: { gte: now },
          quest: {
            metric: targetMetric,
            isActive: true,
          },
        },
        include: { quest: true },
      });

      const updatedQuests: QuestProgressUpdate[] = [];
      let anyLeveledUp = false;

      for (const userQuest of activeUserQuests) {
        const quest = userQuest.quest;
        const prevProgress = userQuest.progress;
        const newProgress = Math.min(
          quest.targetValue,
          prevProgress + amount,
        );
        const isCompletedNow = newProgress >= quest.targetValue;

        const updateData: {
          progress: number;
          status?: 'COMPLETED';
          completedAt?: Date;
        } = {
          progress: newProgress,
        };

        if (isCompletedNow) {
          updateData.status = 'COMPLETED';
          updateData.completedAt = now;
        }

        await tx.userQuest.update({
          where: { id: userQuest.id },
          data: updateData,
        });

        let questXpAwarded = 0;
        if (isCompletedNow && quest.xpReward > 0) {
          const xpResult = await this.xpService.awardXp(
            userId,
            quest.xpReward,
            'QUEST',
            userQuest.id,
            `Completed Quest: ${quest.title}`,
            tx,
          );
          if (xpResult.awarded) {
            questXpAwarded = quest.xpReward;
          }
          if (xpResult.leveledUp) {
            anyLeveledUp = true;
          }
        }

        updatedQuests.push({
          questId: quest.id,
          userQuestId: userQuest.id,
          title: quest.title,
          metric: quest.metric,
          previousProgress: prevProgress,
          currentProgress: newProgress,
          targetValue: quest.targetValue,
          isCompletedNow,
          xpAwarded: questXpAwarded,
        });
      }

      // 4. Evaluate Achievements / Badges
      const unlockedAchievements =
        await this.achievementService.evaluateAchievements(userId, tx);

      // 5. Fetch refreshed game profile
      const latestProfile = await tx.userGameProfile.findUniqueOrThrow({
        where: { id: profile.id },
      });
      const levelInfo = this.xpService.calculateLevel(latestProfile.totalXp);

      this.logger.log(
        `Event [${type} - ${amount}] processed for user ${userId}. Updated ${updatedQuests.length} quests, unlocked ${unlockedAchievements.length} badges.`,
      );

      return {
        processed: true,
        alreadyProcessed: false,
        reference,
        updatedQuests,
        unlockedAchievements,
        profile: {
          ...levelInfo,
          streakDays: latestProfile.streakDays,
          leveledUp: anyLeveledUp,
        },
      };
    });
  }
}
