-- CreateEnum
CREATE TYPE "UsageSimulationStatus" AS ENUM ('RUNNING', 'STOPPED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "dailyDataAllowanceMb" INTEGER;

-- CreateTable
CREATE TABLE "DailyDataUsage" (
    "id" TEXT NOT NULL,
    "simId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "cycleDate" DATE NOT NULL,
    "allowanceMb" INTEGER NOT NULL,
    "usedMb" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDataUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageSimulation" (
    "id" TEXT NOT NULL,
    "simId" TEXT NOT NULL,
    "dailyUsageId" TEXT NOT NULL,
    "status" "UsageSimulationStatus" NOT NULL DEFAULT 'RUNNING',
    "startUsedMb" INTEGER NOT NULL DEFAULT 0,
    "consumedMb" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyDataUsage_cycleDate_idx" ON "DailyDataUsage"("cycleDate");

-- CreateIndex
CREATE INDEX "DailyDataUsage_planId_idx" ON "DailyDataUsage"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDataUsage_simId_cycleDate_key" ON "DailyDataUsage"("simId", "cycleDate");

-- CreateIndex
CREATE INDEX "UsageSimulation_simId_status_idx" ON "UsageSimulation"("simId", "status");

-- CreateIndex
CREATE INDEX "UsageSimulation_dailyUsageId_idx" ON "UsageSimulation"("dailyUsageId");

-- AddForeignKey
ALTER TABLE "DailyDataUsage" ADD CONSTRAINT "DailyDataUsage_simId_fkey" FOREIGN KEY ("simId") REFERENCES "Sim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDataUsage" ADD CONSTRAINT "DailyDataUsage_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageSimulation" ADD CONSTRAINT "UsageSimulation_simId_fkey" FOREIGN KEY ("simId") REFERENCES "Sim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageSimulation" ADD CONSTRAINT "UsageSimulation_dailyUsageId_fkey" FOREIGN KEY ("dailyUsageId") REFERENCES "DailyDataUsage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
