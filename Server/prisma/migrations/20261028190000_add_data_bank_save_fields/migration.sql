-- AlterTable
ALTER TABLE "DailyDataUsage" ADD COLUMN     "bankedAt" TIMESTAMP(3),
ADD COLUMN     "bankedMb" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DataBankTransaction" ADD COLUMN     "dailyUsageId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "dailySaveCapMb" INTEGER;

-- CreateIndex
CREATE INDEX "DataBankTransaction_dailyUsageId_idx" ON "DataBankTransaction"("dailyUsageId");

-- AddForeignKey
ALTER TABLE "DataBankTransaction" ADD CONSTRAINT "DataBankTransaction_dailyUsageId_fkey" FOREIGN KEY ("dailyUsageId") REFERENCES "DailyDataUsage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
