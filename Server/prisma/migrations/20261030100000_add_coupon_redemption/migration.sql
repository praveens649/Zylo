-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponRedemptionId" TEXT,
ADD COLUMN     "discountPaise" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RewardCatalog" ADD COLUMN     "minPurchasePaise" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Order_couponRedemptionId_key" ON "Order"("couponRedemptionId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponRedemptionId_fkey" FOREIGN KEY ("couponRedemptionId") REFERENCES "RewardRedemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
