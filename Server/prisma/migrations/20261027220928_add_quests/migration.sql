-- CreateEnum
CREATE TYPE "QuestMetric" AS ENUM ('DATA_BANK_SAVED_MB', 'DATA_TRANSFERRED_MB', 'DAILY_CHECK_IN', 'QUESTS_COMPLETED');

-- CreateEnum
CREATE TYPE "QuestFrequency" AS ENUM ('DAILY', 'WEEKLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CLAIMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuestRewardType" AS ENUM ('DATA_BANK_MB', 'RECHARGE_DISCOUNT');

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" "QuestMetric" NOT NULL,
    "frequency" "QuestFrequency" NOT NULL DEFAULT 'DAILY',
    "targetValue" INTEGER NOT NULL,
    "rewardType" "QuestRewardType" NOT NULL,
    "rewardAmountMb" INTEGER,
    "rewardDiscountPaise" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "QuestStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardCoupon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userQuestId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPaise" INTEGER NOT NULL,
    "minimumRechargePaise" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quest_isActive_frequency_idx" ON "Quest"("isActive", "frequency");

-- CreateIndex
CREATE INDEX "UserQuest_userId_status_idx" ON "UserQuest"("userId", "status");

-- CreateIndex
CREATE INDEX "UserQuest_periodEnd_status_idx" ON "UserQuest"("periodEnd", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuest_userId_questId_periodStart_key" ON "UserQuest"("userId", "questId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "RewardCoupon_userQuestId_key" ON "RewardCoupon"("userQuestId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardCoupon_code_key" ON "RewardCoupon"("code");

-- CreateIndex
CREATE INDEX "RewardCoupon_userId_expiresAt_idx" ON "RewardCoupon"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardCoupon" ADD CONSTRAINT "RewardCoupon_userQuestId_fkey" FOREIGN KEY ("userQuestId") REFERENCES "UserQuest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
