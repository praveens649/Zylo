import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

const TIME_ZONE = 'Asia/Kolkata';

@Injectable()
export class QuestCronService {
  private readonly logger = new Logger(QuestCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to get calendar date in Asia/Kolkata timezone.
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
   * Runs daily at Midnight Asia/Kolkata (00:00 IST).
   * 1. Marks expired uncompleted user quests as EXPIRED.
   * 2. Checks active user streaks and resets streaks if the user was inactive yesterday.
   */
  @Cron('0 0 * * *', {
    name: 'daily-quest-rotation',
    timeZone: TIME_ZONE,
  })
  async handleDailyQuestRotation() {
    this.logger.log('Starting daily quest rotation and streak maintenance job...');
    const result = await this.performMaintenance();
    this.logger.log(
      `Daily quest maintenance completed: ${result.expiredCount} quests expired, ${result.streaksResetCount} streaks reset.`,
    );
  }

  /**
   * Core maintenance logic (can be triggered manually or via cron).
   */
  async performMaintenance(): Promise<{
    expiredCount: number;
    streaksResetCount: number;
    expiredPacksResetCount: number;
  }> {
    const now = new Date();

    // 1. Mark expired in-progress user quests
    const expireResult = await this.prisma.userQuest.updateMany({
      where: {
        status: 'IN_PROGRESS',
        periodEnd: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // 2. Evaluate streaks: Users who missed yesterday lose their active streak
    const today = this.getKolkataDate(now);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Any profile whose lastActiveDate is strictly before yesterday and streakDays > 0 gets reset to 0
    const resetStreaks = await this.prisma.userGameProfile.updateMany({
      where: {
        streakDays: { gt: 0 },
        OR: [
          { lastActiveDate: null },
          { lastActiveDate: { lt: yesterday } },
        ],
      },
      data: {
        streakDays: 0,
      },
    });

    // 3. Reset spendable pack XP to 0 for users whose plan pack has expired
    const expiredPacks = await this.prisma.userGameProfile.updateMany({
      where: {
        packExpiryDate: { lt: now },
        spendablePackXp: { gt: 0 },
      },
      data: {
        spendablePackXp: 0,
        activePlanSubId: null,
      },
    });

    return {
      expiredCount: expireResult.count,
      streaksResetCount: resetStreaks.count,
      expiredPacksResetCount: expiredPacks.count,
    };
  }
}
