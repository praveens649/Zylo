-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "dailySaveCapMb";

-- AlterTable
ALTER TABLE "DailyDataUsage" ADD COLUMN     "redeemedMb" INTEGER NOT NULL DEFAULT 0;