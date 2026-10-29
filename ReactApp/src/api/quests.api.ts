import { api } from "@/lib/api";

export interface QuestItem {
  id: string;
  questId: string;
  title: string;
  description: string;
  metric: string;
  progress: number;
  targetValue: number;
  progressPercent: number;
  xpReward: number;
  status: "IN_PROGRESS" | "COMPLETED" | "CLAIMED" | "EXPIRED";
  isCompleted: boolean;
  completedAt: string | null;
}

export interface QuestWeekGroup {
  weekNumber: number;
  label: string;
  isCurrent: boolean;
  isLocked: boolean;
  isCompleted: boolean;
  quests: QuestItem[];
}

export interface VoucherItem {
  id: string;
  name: string;
  description: string | null;
  type: "DATA_MB" | "COUPON" | "BADGE" | "TITLE";
  requiredXp: number;
  valueMb: number | null;
  discountPaise: number | null;
  badgeCode: string | null;
  canAfford: boolean;
  isBadgeOwned: boolean;
}

export interface RedemptionRecord {
  id: string;
  name: string;
  type: "DATA_MB" | "COUPON" | "BADGE" | "TITLE";
  couponCode: string | null;
  valueMb: number | null;
  discountPaise: number | null;
  badgeCode: string | null;
  redeemedAt: string;
  expiresAt: string | null;
  isUsed: boolean;
}

export interface QuestBoardData {
  planInfo: {
    isPlanActive: boolean;
    planName: string;
    validityDays: number;
    totalWeeks: number;
    currentWeek: number;
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number;
  };
  wallet: {
    spendablePackXp: number;
    packTotalEarned: number;
    packTargetXp: number;
  };
  profile: {
    level: number;
    streakDays: number;
    unlockedBadges: string[];
    lastActiveDate: string | null;
    checkedInToday?: boolean;
  };
  weeks: QuestWeekGroup[];
  vouchers: VoucherItem[];
  myRedemptions: RedemptionRecord[];
}

export interface RedeemVoucherResult {
  success: boolean;
  voucherName: string;
  type: "DATA_MB" | "COUPON" | "BADGE" | "TITLE";
  spentXp: number;
  remainingSpendableXp: number;
  couponCode: string | null;
  expiresAt: string | null;
  valueMb: number | null;
  badgeCode: string | null;
}

export const questsApi = {
  getBoard: () => api.get<QuestBoardData>("/api/v1/quests/board"),

  dailyCheckIn: () => api.post<any>("/api/v1/quests/check-in"),

  redeemVoucher: (voucherId: string) =>
    api.post<RedeemVoucherResult>(`/api/v1/quests/vouchers/${voucherId}/redeem`),
};

export const QUEST_BOARD_KEY = ["quests", "board"] as const;
