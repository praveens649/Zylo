import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { XpSource } from '../generated/prisma/enums.js';
import type { LevelInfo } from './data-quest.types.js';

export const XP_PER_LEVEL = 500;

@Injectable()
export class XpLevelService {
  private readonly logger = new Logger(XpLevelService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes user level, current XP within that level, and percent to next level.
   * Matches Zylo blueprint: 500 XP per level (e.g. 840 total XP -> Level 2, 340/500 XP).
   */
  calculateLevel(totalXp: number): LevelInfo {
    const safeXp = Math.max(0, totalXp);
    const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
    const currentXp = safeXp % XP_PER_LEVEL;
    const progressPercent = Math.min(
      100,
      Math.round((currentXp / XP_PER_LEVEL) * 100),
    );

    return {
      level,
      totalXp: safeXp,
      currentXp,
      xpRequiredForNextLevel: XP_PER_LEVEL,
      progressPercent,
    };
  }

  /**
   * Fetches or lazily initializes the UserGameProfile.
   */
  async getOrCreateProfile(
    userId: string,
    tx?: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ) {
    const client = tx ?? this.prisma;
    let profile = await client.userGameProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await client.userGameProfile.create({
        data: {
          userId,
          level: 1,
          totalXp: 0,
          currentXp: 0,
          streakDays: 0,
        },
      });
      this.logger.log(`Initialized game profile for user ${userId}`);
    }

    return profile;
  }

  /**
   * Idempotently awards XP to a user from a verified source (quest, achievement, streak, etc.).
   * If source + sourceId was already credited in XpLedger, returns without double-awarding.
   */
  async awardXp(
    userId: string,
    xpAmount: number,
    source: XpSource,
    sourceId: string,
    description: string,
    tx?: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<{
    awarded: boolean;
    levelInfo: LevelInfo;
    leveledUp: boolean;
  }> {
    const client = tx ?? this.prisma;

    if (xpAmount <= 0) {
      const currentProfile = await this.getOrCreateProfile(userId, client);
      return {
        awarded: false,
        levelInfo: this.calculateLevel(currentProfile.totalXp),
        leveledUp: false,
      };
    }

    // 1. Strict Idempotency Check
    const existing = await client.xpLedger.findFirst({
      where: {
        userId,
        source,
        sourceId,
      },
    });

    if (existing) {
      this.logger.warn(
        `Duplicate XP request ignored for user ${userId}: ${source} -> ${sourceId}`,
      );
      const currentProfile = await this.getOrCreateProfile(userId, client);
      return {
        awarded: false,
        levelInfo: this.calculateLevel(currentProfile.totalXp),
        leveledUp: false,
      };
    }

    // 2. Fetch or create profile
    const profile = await this.getOrCreateProfile(userId, client);
    const oldLevel = profile.level;
    const newSpendablePackXp = (profile.spendablePackXp ?? 0) + xpAmount;
    const newPackTotalEarned = (profile.packTotalEarned ?? 0) + xpAmount;
    const newTotalXp = profile.totalXp + xpAmount;
    const levelInfo = this.calculateLevel(newTotalXp);
    const leveledUp = levelInfo.level > oldLevel;

    // Badges persist permanently
    const currentBadges = new Set(profile.unlockedBadges || []);
    if (!currentBadges.has('LEVEL_1_ROOKIE')) {
      currentBadges.add('LEVEL_1_ROOKIE');
    }
    if (newPackTotalEarned >= 500 && !currentBadges.has('LEVEL_2_DATA_EXPLORER')) {
      currentBadges.add('LEVEL_2_DATA_EXPLORER');
    }
    if (newPackTotalEarned >= 850 && !currentBadges.has('LEVEL_3_CYBER_MASTER')) {
      currentBadges.add('LEVEL_3_CYBER_MASTER');
    }

    // 3. Atomically write ledger & update profile
    await client.xpLedger.create({
      data: {
        userId,
        source,
        sourceId,
        xpAmount,
        description,
      },
    });

    await client.userGameProfile.update({
      where: { id: profile.id },
      data: {
        level: levelInfo.level,
        totalXp: newTotalXp,
        currentXp: levelInfo.currentXp,
        spendablePackXp: newSpendablePackXp,
        packTotalEarned: newPackTotalEarned,
        unlockedBadges: Array.from(currentBadges),
      },
    });

    this.logger.log(
      `Awarded +${xpAmount} XP to user ${userId} (${source}:${sourceId}). Spendable Pack XP now: ${newSpendablePackXp}`,
    );

    return {
      awarded: true,
      levelInfo,
      leveledUp,
    };
  }
}
