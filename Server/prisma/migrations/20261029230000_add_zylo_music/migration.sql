-- Zylo Music — streaming subscription (plans + subscriptions + order type).

-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'MUSIC_SUBSCRIPTION';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "musicPlanId" TEXT;

-- CreateTable
CREATE TABLE "MusicPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'inr',
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "audioQuality" TEXT NOT NULL DEFAULT 'standard',
    "maxDevices" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "PlanSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MusicSubscription_orderId_key" ON "MusicSubscription"("orderId");

-- CreateIndex
CREATE INDEX "MusicSubscription_userId_status_idx" ON "MusicSubscription"("userId", "status");

-- CreateIndex
CREATE INDEX "MusicSubscription_planId_idx" ON "MusicSubscription"("planId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_musicPlanId_fkey" FOREIGN KEY ("musicPlanId") REFERENCES "MusicPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicSubscription" ADD CONSTRAINT "MusicSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicSubscription" ADD CONSTRAINT "MusicSubscription_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicSubscription" ADD CONSTRAINT "MusicSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MusicPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
