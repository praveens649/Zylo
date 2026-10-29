import type { QuestMetric } from '../generated/prisma/enums.js';

export type QuestEventType =
  | 'DATA_SAVED'
  | 'DATA_SENT'
  | 'DATA_REDEEMED'
  | 'DAILY_CHECK_IN'
  | 'PLAN_RECHARGED';

export interface VerifiedQuestEvent {
  type: QuestEventType;
  userId: string;
  amount: number; // e.g. amount in MB, or 1 for check-in / recharge
  reference: string; // unique transaction/event reference for idempotency
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface LevelInfo {
  level: number;
  totalXp: number;
  currentXp: number;
  xpRequiredForNextLevel: number;
  progressPercent: number;
}

export interface QuestProgressUpdate {
  questId: string;
  userQuestId: string;
  title: string;
  metric: QuestMetric;
  previousProgress: number;
  currentProgress: number;
  targetValue: number;
  isCompletedNow: boolean;
  xpAwarded: number;
}

export interface UnlockedBadge {
  id: string;
  name: string;
  description: string;
  badgeTier: string;
  iconUrl?: string | null;
  xpAwarded: number;
}

export interface QuestEvaluationResult {
  processed: boolean;
  alreadyProcessed: boolean;
  reference: string;
  updatedQuests: QuestProgressUpdate[];
  unlockedAchievements: UnlockedBadge[];
  profile: LevelInfo & {
    streakDays: number;
    leveledUp: boolean;
  };
}
