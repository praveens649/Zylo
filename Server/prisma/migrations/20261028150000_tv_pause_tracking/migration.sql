-- AlterTable
ALTER TABLE "SetTopBoxConnection" ADD COLUMN     "pauseDaysUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pauseWindowStartedAt" TIMESTAMP(3);
