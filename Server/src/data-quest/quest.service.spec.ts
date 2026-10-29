import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuestService } from './quest.service.js';
import { XpLevelService } from './xp-level.service.js';
import { BadRequestException } from '@nestjs/common';

describe('QuestService - Pack-Bound Weekly Quests & Spendable XP', () => {
  let questService: QuestService;
  let fakePrisma: any;
  let xpService: XpLevelService;

  beforeEach(() => {
    fakePrisma = {
      quest: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'q1',
            title: 'Week 1: Welcome Check-in',
            metric: 'DAILY_CHECK_IN',
            targetValue: 3,
            xpReward: 75,
            weekNumber: 1,
            isActive: true,
          },
          {
            id: 'q2',
            title: 'Week 2: Vault Builder',
            metric: 'DATA_BANK_SAVED_MB',
            targetValue: 600,
            xpReward: 100,
            weekNumber: 2,
            isActive: true,
          },
        ]),
      },
      rewardCatalog: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      planSubscription: {
        findFirst: vi.fn(),
      },
      userGameProfile: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      userQuest: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({}),
      },
      rewardRedemption: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      sim: {
        findFirst: vi.fn(),
      },
      dataBankAccount: {
        upsert: vi.fn().mockResolvedValue({ id: 'dba_1', balanceMb: 1000 }),
      },
      dataBankTransaction: {
        create: vi.fn(),
      },
      xpLedger: {
        create: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(fakePrisma)),
    };

    xpService = new XpLevelService(fakePrisma);
    questService = new QuestService(fakePrisma, xpService);
  });

  describe('Plan Duration & Week Segmentation', () => {
    it('correctly calculates total weeks for a 28-day plan (4 weeks) and sets up cycle', async () => {
      const now = new Date();
      const startDate = now;
      const endDate = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

      fakePrisma.userGameProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        level: 1,
        spendablePackXp: 0,
        packTotalEarned: 0,
        activePlanSubId: null,
        unlockedBadges: ['LEVEL_1_ROOKIE'],
      });

      fakePrisma.userGameProfile.update.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        activePlanSubId: 'sub_28d',
        spendablePackXp: 0,
      });

      fakePrisma.planSubscription.findFirst.mockResolvedValue({
        id: 'sub_28d',
        startDate,
        endDate,
        plan: {
          id: 'plan_28',
          name: 'Zylo 28-Day Unlimited',
          validityDays: 28,
        },
      });

      const cycle = await questService.syncUserPackCycle('u_1');

      expect(cycle.totalWeeks).toBe(4);
      expect(cycle.currentWeek).toBe(1);
      expect(cycle.isPlanActive).toBe(true);
      expect(fakePrisma.userGameProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            spendablePackXp: 0,
            packTotalWeeks: 4,
          }),
        }),
      );
    });

    it('correctly calculates total weeks for an 84-day plan (12 weeks)', async () => {
      const now = new Date();
      const startDate = now;
      const endDate = new Date(now.getTime() + 84 * 24 * 60 * 60 * 1000);

      fakePrisma.userGameProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        activePlanSubId: 'sub_84d',
        spendablePackXp: 350,
      });

      fakePrisma.planSubscription.findFirst.mockResolvedValue({
        id: 'sub_84d',
        startDate,
        endDate,
        plan: {
          id: 'plan_84',
          name: 'Zylo 84-Day Binge',
          validityDays: 84,
        },
      });

      const cycle = await questService.syncUserPackCycle('u_1');
      expect(cycle.totalWeeks).toBe(12);
      expect(cycle.isPlanActive).toBe(true);
    });
  });

  describe('Spendable XP Currency & Voucher Redemption', () => {
    it('successfully redeems a voucher, spending pack XP and leaving the remainder', async () => {
      fakePrisma.rewardCatalog.findUnique.mockResolvedValue({
        id: 'v_50disc',
        name: '₹50 Recharge Discount',
        type: 'COUPON',
        requiredXp: 500,
        discountPaise: 5000,
        isActive: true,
      });

      fakePrisma.userGameProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        spendablePackXp: 865,
        unlockedBadges: ['LEVEL_1_ROOKIE', 'LEVEL_2_DATA_EXPLORER'],
      });

      fakePrisma.rewardRedemption.create.mockResolvedValue({
        id: 'red_1',
      });

      const result = await questService.redeemVoucher('u_1', 'v_50disc');

      expect(result.success).toBe(true);
      expect(result.spentXp).toBe(500);
      expect(result.remainingSpendableXp).toBe(365); // 865 - 500 = 365
      expect(result.couponCode).toMatch(/^ZYLO-/);

      expect(fakePrisma.userGameProfile.update).toHaveBeenCalledWith({
        where: { id: 'prof_1' },
        data: expect.objectContaining({
          spendablePackXp: 365,
        }),
      });
    });

    it('rejects voucher redemption when spendable pack XP is insufficient', async () => {
      fakePrisma.rewardCatalog.findUnique.mockResolvedValue({
        id: 'v_100disc',
        name: '₹100 Grand Recharge Coupon',
        type: 'COUPON',
        requiredXp: 800,
        isActive: true,
      });

      fakePrisma.userGameProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        spendablePackXp: 365,
      });

      await expect(
        questService.redeemVoucher('u_1', 'v_100disc'),
      ).rejects.toThrow(BadRequestException);
    });

    it('resets spendable XP to 0 when plan has expired while preserving unlocked badges', async () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      fakePrisma.userGameProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        userId: 'u_1',
        activePlanSubId: 'sub_expired',
        spendablePackXp: 450,
        unlockedBadges: ['LEVEL_1_ROOKIE', 'LEVEL_2_DATA_EXPLORER'],
      });

      fakePrisma.planSubscription.findFirst.mockResolvedValue({
        id: 'sub_expired',
        startDate: new Date(pastDate.getTime() - 28 * 24 * 60 * 60 * 1000),
        endDate: pastDate,
        plan: {
          id: 'plan_28',
          validityDays: 28,
        },
      });

      await questService.syncUserPackCycle('u_1');

      expect(fakePrisma.userGameProfile.update).toHaveBeenCalledWith({
        where: { id: 'prof_1' },
        data: expect.objectContaining({
          spendablePackXp: 0,
          activePlanSubId: null,
        }),
      });
    });
  });
});
