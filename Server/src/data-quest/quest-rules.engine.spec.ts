import { describe, it, expect, beforeEach, vi } from 'vitest';
import { XpLevelService } from './xp-level.service.js';
import { QuestRulesEngine } from './quest-rules.engine.js';
import { AchievementService } from './achievement.service.js';
import { QuestCronService } from './quest-cron.service.js';

describe('Data Quest Engine Verification Rules & Validation', () => {
  let xpService: XpLevelService;
  let fakePrisma: any;

  beforeEach(() => {
    fakePrisma = {
      userGameProfile: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        updateMany: vi.fn(),
      },
      xpLedger: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      userQuest: {
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      achievement: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
      userAchievement: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      dataBankTransaction: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { amountMb: 500 } }),
      },
      dataTransfer: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { amountMb: 0 } }),
      },
      $transaction: vi.fn((callback) => callback(fakePrisma)),
    };

    xpService = new XpLevelService(fakePrisma);
  });

  describe('Level Progression & Thresholds', () => {
    it('calculates correct level and current XP matching blueprint (500 XP per level)', () => {
      // 0 XP -> Level 1 (0 / 500)
      const lvl0 = xpService.calculateLevel(0);
      expect(lvl0.level).toBe(1);
      expect(lvl0.currentXp).toBe(0);
      expect(lvl0.progressPercent).toBe(0);

      // 340 XP -> Level 1 (340 / 500, 68%)
      const lvl340 = xpService.calculateLevel(340);
      expect(lvl340.level).toBe(1);
      expect(lvl340.currentXp).toBe(340);
      expect(lvl340.progressPercent).toBe(68);

      // 840 XP -> Level 2 (340 / 500, 68% progress to Level 3)
      const lvl840 = xpService.calculateLevel(840);
      expect(lvl840.level).toBe(2);
      expect(lvl840.currentXp).toBe(340);
      expect(lvl840.progressPercent).toBe(68);
    });

    it('idempotently awards XP and prevents duplicate credits from the same source', async () => {
      fakePrisma.xpLedger.findFirst.mockResolvedValueOnce({ id: 'existing_ledger_1' });
      fakePrisma.userGameProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        level: 1,
        totalXp: 100,
        currentXp: 100,
      });

      const res = await xpService.awardXp('u_1', 100, 'QUEST', 'quest_1', 'Test Quest');

      expect(res.awarded).toBe(false);
      expect(fakePrisma.xpLedger.create).not.toHaveBeenCalled();
    });

    it('awards XP and updates user level when threshold is crossed', async () => {
      fakePrisma.xpLedger.findFirst.mockResolvedValueOnce(null);
      fakePrisma.userGameProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        level: 1,
        totalXp: 450,
        currentXp: 450,
      });

      const res = await xpService.awardXp('u_1', 100, 'QUEST', 'quest_2', 'Complete Save 500 MB');

      expect(res.awarded).toBe(true);
      expect(res.levelInfo.totalXp).toBe(550);
      expect(res.levelInfo.level).toBe(2);
      expect(res.levelInfo.currentXp).toBe(50);
      expect(res.leveledUp).toBe(true);
      expect(fakePrisma.xpLedger.create).toHaveBeenCalled();
      expect(fakePrisma.userGameProfile.update).toHaveBeenCalledWith({
        where: { id: 'prof_1' },
        data: expect.objectContaining({
          level: 2,
          totalXp: 550,
          currentXp: 50,
          spendablePackXp: 100,
          packTotalEarned: 100,
        }),
      });
    });
  });

  describe('QuestRulesEngine Verification & Idempotency', () => {
    it('ignores duplicate event references to prevent replay attacks and double XP', async () => {
      fakePrisma.xpLedger.findFirst.mockResolvedValueOnce({ id: 'tx_ref_1' });
      fakePrisma.userGameProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        level: 1,
        totalXp: 100,
        streakDays: 2,
      });

      const achService = new AchievementService(fakePrisma, xpService);
      const engine = new QuestRulesEngine(fakePrisma, xpService, achService);

      const result = await engine.processVerifiedEvent({
        type: 'DATA_SAVED',
        userId: 'u_1',
        amount: 500,
        reference: 'tx_ref_1',
      });

      expect(result.processed).toBe(false);
      expect(result.alreadyProcessed).toBe(true);
      expect(result.updatedQuests).toHaveLength(0);
    });

    it('processes verified DATA_SAVED event, updates progress, and marks quest COMPLETED', async () => {
      // Not yet processed
      fakePrisma.xpLedger.findFirst.mockResolvedValue(null);
      fakePrisma.userGameProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        level: 1,
        totalXp: 0,
        currentXp: 0,
        streakDays: 1,
        lastActiveDate: new Date(),
      });
      fakePrisma.userGameProfile.findUniqueOrThrow.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        level: 1,
        totalXp: 100,
        currentXp: 100,
        streakDays: 1,
        lastActiveDate: new Date(),
      });

      // Active user quest: 0 / 500 MB
      fakePrisma.userQuest.findMany.mockResolvedValue([
        {
          id: 'user_quest_1',
          progress: 0,
          quest: {
            id: 'quest_save_500',
            title: 'Save 500 MB',
            metric: 'DATA_BANK_SAVED_MB',
            targetValue: 500,
            xpReward: 100,
            isActive: true,
          },
        },
      ]);
      fakePrisma.userAchievement.findMany.mockResolvedValue([]);
      fakePrisma.achievement.findMany.mockResolvedValue([]);

      const achService = new AchievementService(fakePrisma, xpService);
      const engine = new QuestRulesEngine(fakePrisma, xpService, achService);

      const result = await engine.processVerifiedEvent({
        type: 'DATA_SAVED',
        userId: 'u_1',
        amount: 500,
        reference: 'tx_save_500_success',
      });

      expect(result.processed).toBe(true);
      expect(result.alreadyProcessed).toBe(false);
      expect(result.updatedQuests).toHaveLength(1);
      expect(result.updatedQuests[0].currentProgress).toBe(500);
      expect(result.updatedQuests[0].isCompletedNow).toBe(true);
      expect(result.updatedQuests[0].xpAwarded).toBe(100);

      expect(fakePrisma.userQuest.update).toHaveBeenCalledWith({
        where: { id: 'user_quest_1' },
        data: expect.objectContaining({
          progress: 500,
          status: 'COMPLETED',
        }),
      });
    });

    it('processes DAILY_CHECK_IN event: awards +25 XP, creates ledger entry, and advances streak', async () => {
      fakePrisma.xpLedger.findFirst.mockResolvedValue(null);
      fakePrisma.userGameProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        level: 1,
        totalXp: 100,
        currentXp: 100,
        streakDays: 1,
        lastActiveDate: null,
      });
      fakePrisma.userGameProfile.findUniqueOrThrow.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        level: 1,
        totalXp: 125,
        currentXp: 125,
        streakDays: 1,
        lastActiveDate: new Date(),
      });
      fakePrisma.userQuest.findMany.mockResolvedValue([]);
      fakePrisma.userAchievement.findMany.mockResolvedValue([]);
      fakePrisma.achievement.findMany.mockResolvedValue([]);

      const achService = new AchievementService(fakePrisma, xpService);
      const engine = new QuestRulesEngine(fakePrisma, xpService, achService);

      const result = await engine.triggerDailyCheckIn('u_1');

      expect(result.processed).toBe(true);
      expect(result.alreadyProcessed).toBe(false);
      expect(fakePrisma.xpLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u_1',
            source: 'STREAK',
            xpAmount: 25,
            sourceId: expect.stringMatching(/^checkin_u_1_\d{4}-\d{2}-\d{2}$/),
          }),
        }),
      );
    });

    it('rejects second check-in on the same day without double awarding XP', async () => {
      const todayDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

      // Idempotency guard finds existing check-in in xpLedger
      fakePrisma.xpLedger.findFirst.mockResolvedValue({
        id: 'existing_ledger_1',
        sourceId: `checkin_u_1_${todayDateStr}`,
        source: 'STREAK',
        xpAmount: 25,
      });
      fakePrisma.userGameProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        level: 1,
        totalXp: 125,
        currentXp: 125,
        streakDays: 2,
        lastActiveDate: new Date(),
      });

      const achService = new AchievementService(fakePrisma, xpService);
      const engine = new QuestRulesEngine(fakePrisma, xpService, achService);

      const result = await engine.triggerDailyCheckIn('u_1');

      expect(result.processed).toBe(false);
      expect(result.alreadyProcessed).toBe(true);
      expect(result.updatedQuests).toHaveLength(0);
      expect(result.profile.streakDays).toBe(2);
    });
  });

  describe('QuestCronService Scheduled Jobs', () => {
    it('expires past in-progress quests and resets inactive streaks', async () => {
      fakePrisma.userQuest.updateMany.mockResolvedValue({ count: 5 });
      fakePrisma.userGameProfile.updateMany.mockResolvedValue({ count: 2 });

      const cron = new QuestCronService(fakePrisma);
      const res = await cron.performMaintenance();

      expect(res.expiredCount).toBe(5);
      expect(res.streaksResetCount).toBe(2);
      expect(fakePrisma.userQuest.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'IN_PROGRESS',
          periodEnd: { lt: expect.any(Date) },
        },
        data: { status: 'EXPIRED' },
      });
    });
  });
});
