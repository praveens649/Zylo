/*
  Warnings:

  - You are about to drop the column `reservedById` on the `PhoneNumber` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('QUEST', 'ACHIEVEMENT', 'STREAK', 'BONUS', 'ADMIN');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('DATA_MB', 'BADGE', 'TITLE', 'COUPON');

-- CreateEnum
CREATE TYPE "RewardRedemptionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestMetric" ADD VALUE 'DATA_BANK_REDEEMED_MB';
ALTER TYPE "QuestMetric" ADD VALUE 'PLAN_RECHARGED';
ALTER TYPE "QuestMetric" ADD VALUE 'STREAK_DAYS';

-- AlterEnum
ALTER TYPE "QuestRewardType" ADD VALUE 'XP_ONLY';

-- DropIndex
DROP INDEX "BusinessInvite_phoneNumberId_idx";

-- AlterTable
ALTER TABLE "PhoneNumber" DROP COLUMN "reservedById";

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "weekNumber" INTEGER,
ADD COLUMN     "xpReward" INTEGER NOT NULL DEFAULT 100,
ALTER COLUMN "rewardType" SET DEFAULT 'XP_ONLY';

-- AlterTable
ALTER TABLE "UserQuest" ADD COLUMN     "planSubId" TEXT,
ADD COLUMN     "weekNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "UserGameProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "currentXp" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATE,
    "unlockedBadges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activePlanSubId" TEXT,
    "spendablePackXp" INTEGER NOT NULL DEFAULT 0,
    "packTotalEarned" INTEGER NOT NULL DEFAULT 0,
    "packTotalWeeks" INTEGER NOT NULL DEFAULT 4,
    "packStartDate" TIMESTAMP(3),
    "packExpiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGameProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "badgeTier" TEXT NOT NULL DEFAULT 'BRONZE',
    "conditionType" TEXT NOT NULL,
    "conditionValue" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "XpSource" NOT NULL,
    "sourceId" TEXT,
    "xpAmount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "RewardType" NOT NULL,
    "valueMb" INTEGER,
    "discountPaise" INTEGER,
    "badgeCode" TEXT,
    "requiredXp" INTEGER NOT NULL DEFAULT 0,
    "requiredLevel" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "status" "RewardRedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "couponCode" TEXT,
    "discountPaise" INTEGER,
    "valueMb" INTEGER,
    "badgeCode" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGameProfile_userId_key" ON "UserGameProfile"("userId");

-- CreateIndex
CREATE INDEX "UserGameProfile_level_idx" ON "UserGameProfile"("level");

-- CreateIndex
CREATE INDEX "UserGameProfile_totalXp_idx" ON "UserGameProfile"("totalXp");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_name_key" ON "Achievement"("name");

-- CreateIndex
CREATE INDEX "Achievement_conditionType_conditionValue_idx" ON "Achievement"("conditionType", "conditionValue");

-- CreateIndex
CREATE INDEX "Achievement_isActive_idx" ON "Achievement"("isActive");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_unlockedAt_idx" ON "UserAchievement"("userId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "XpLedger_userId_createdAt_idx" ON "XpLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "XpLedger_source_sourceId_idx" ON "XpLedger"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardCatalog_name_key" ON "RewardCatalog"("name");

-- CreateIndex
CREATE INDEX "RewardCatalog_isActive_requiredLevel_idx" ON "RewardCatalog"("isActive", "requiredLevel");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRedemption_reference_key" ON "RewardRedemption"("reference");

-- CreateIndex
CREATE INDEX "RewardRedemption_userId_status_idx" ON "RewardRedemption"("userId", "status");

-- CreateIndex
CREATE INDEX "UserQuest_userId_planSubId_weekNumber_idx" ON "UserQuest"("userId", "planSubId", "weekNumber");

-- AddForeignKey
ALTER TABLE "UserGameProfile" ADD CONSTRAINT "UserGameProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpLedger" ADD CONSTRAINT "XpLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "RewardCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
