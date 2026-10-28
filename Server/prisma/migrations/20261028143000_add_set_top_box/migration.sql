-- CreateEnum
CREATE TYPE "SetTopBoxResolution" AS ENUM ('HD', 'UHD_4K');

-- CreateEnum
CREATE TYPE "SetTopBoxUnitStatus" AS ENUM ('IN_STOCK', 'RESERVED', 'ASSIGNED', 'INSTALLED', 'FAULTY', 'RETURNED', 'RETIRED');

-- CreateEnum
CREATE TYPE "BoxOwnership" AS ENUM ('PURCHASE', 'RENTAL');

-- CreateEnum
CREATE TYPE "TvConnectionStatus" AS ENUM ('PENDING_INSTALLATION', 'ACTIVE', 'PAUSED', 'GRACE_PERIOD', 'SUSPENDED', 'DISCONNECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TvPlanType" AS ENUM ('BASE', 'ADD_ON');

-- CreateEnum
CREATE TYPE "TvSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstallationType" AS ENUM ('TECHNICIAN', 'SELF_INSTALL');

-- CreateEnum
CREATE TYPE "InstallationSlot" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "InstallationStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderType" ADD VALUE 'SET_TOP_BOX_ORDER';
ALTER TYPE "OrderType" ADD VALUE 'TV_PACK_PURCHASE';

-- AlterEnum
ALTER TYPE "SupportCategory" ADD VALUE 'SET_TOP_BOX';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "setTopBoxConnectionId" TEXT,
ADD COLUMN     "setTopBoxModelId" TEXT,
ADD COLUMN     "tvPlanId" TEXT;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "setTopBoxConnectionId" TEXT;

-- CreateTable
CREATE TABLE "SetTopBoxModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "resolution" "SetTopBoxResolution" NOT NULL DEFAULT 'HD',
    "isSmart" BOOLEAN NOT NULL DEFAULT false,
    "hasRecording" BOOLEAN NOT NULL DEFAULT false,
    "storageGb" INTEGER,
    "imageFileId" TEXT,
    "purchasePrice" DECIMAL(10,2),
    "rentalPerMonth" DECIMAL(10,2),
    "securityDeposit" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetTopBoxModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetTopBoxUnit" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "macAddress" TEXT NOT NULL,
    "smartCardNumber" TEXT NOT NULL,
    "status" "SetTopBoxUnitStatus" NOT NULL DEFAULT 'IN_STOCK',
    "warrantyEndsAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetTopBoxUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetTopBoxConnection" (
    "id" TEXT NOT NULL,
    "connectionNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "simId" TEXT,
    "unitId" TEXT,
    "ownership" "BoxOwnership" NOT NULL DEFAULT 'PURCHASE',
    "status" "TvConnectionStatus" NOT NULL DEFAULT 'PENDING_INSTALLATION',
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "planExpiredAt" TIMESTAMP(3),
    "gracePeriodEndsAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pauseEndsAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "returnDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetTopBoxConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TvPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TvPlanType" NOT NULL DEFAULT 'BASE',
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'inr',
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "channelCount" INTEGER NOT NULL,
    "hdChannelCount" INTEGER NOT NULL DEFAULT 0,
    "languages" TEXT[],
    "requires4kBox" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TvPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TvSubscription" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "tvPlanId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "TvSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TvSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallationRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "type" "InstallationType" NOT NULL DEFAULT 'TECHNICIAN',
    "status" "InstallationStatus" NOT NULL DEFAULT 'REQUESTED',
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "preferredSlot" "InstallationSlot" NOT NULL DEFAULT 'MORNING',
    "scheduledAt" TIMESTAMP(3),
    "customerNotes" TEXT,
    "technicianName" TEXT,
    "technicianPhone" TEXT,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SetTopBoxModel_name_key" ON "SetTopBoxModel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SetTopBoxModel_sku_key" ON "SetTopBoxModel"("sku");

-- CreateIndex
CREATE INDEX "SetTopBoxModel_isActive_resolution_idx" ON "SetTopBoxModel"("isActive", "resolution");

-- CreateIndex
CREATE UNIQUE INDEX "SetTopBoxUnit_serialNumber_key" ON "SetTopBoxUnit"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SetTopBoxUnit_macAddress_key" ON "SetTopBoxUnit"("macAddress");

-- CreateIndex
CREATE UNIQUE INDEX "SetTopBoxUnit_smartCardNumber_key" ON "SetTopBoxUnit"("smartCardNumber");

-- CreateIndex
CREATE INDEX "SetTopBoxUnit_modelId_status_idx" ON "SetTopBoxUnit"("modelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SetTopBoxConnection_connectionNumber_key" ON "SetTopBoxConnection"("connectionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SetTopBoxConnection_unitId_key" ON "SetTopBoxConnection"("unitId");

-- CreateIndex
CREATE INDEX "SetTopBoxConnection_userId_status_idx" ON "SetTopBoxConnection"("userId", "status");

-- CreateIndex
CREATE INDEX "SetTopBoxConnection_status_planExpiredAt_idx" ON "SetTopBoxConnection"("status", "planExpiredAt");

-- CreateIndex
CREATE INDEX "SetTopBoxConnection_simId_idx" ON "SetTopBoxConnection"("simId");

-- CreateIndex
CREATE UNIQUE INDEX "TvPlan_name_key" ON "TvPlan"("name");

-- CreateIndex
CREATE INDEX "TvPlan_type_isActive_idx" ON "TvPlan"("type", "isActive");

-- CreateIndex
CREATE INDEX "TvPlan_price_idx" ON "TvPlan"("price");

-- CreateIndex
CREATE UNIQUE INDEX "TvSubscription_orderId_key" ON "TvSubscription"("orderId");

-- CreateIndex
CREATE INDEX "TvSubscription_connectionId_status_idx" ON "TvSubscription"("connectionId", "status");

-- CreateIndex
CREATE INDEX "TvSubscription_status_endDate_idx" ON "TvSubscription"("status", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "InstallationRequest_reference_key" ON "InstallationRequest"("reference");

-- CreateIndex
CREATE INDEX "InstallationRequest_connectionId_status_idx" ON "InstallationRequest"("connectionId", "status");

-- CreateIndex
CREATE INDEX "InstallationRequest_status_scheduledAt_idx" ON "InstallationRequest"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Order_setTopBoxConnectionId_idx" ON "Order"("setTopBoxConnectionId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_setTopBoxModelId_fkey" FOREIGN KEY ("setTopBoxModelId") REFERENCES "SetTopBoxModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tvPlanId_fkey" FOREIGN KEY ("tvPlanId") REFERENCES "TvPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_setTopBoxConnectionId_fkey" FOREIGN KEY ("setTopBoxConnectionId") REFERENCES "SetTopBoxConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_setTopBoxConnectionId_fkey" FOREIGN KEY ("setTopBoxConnectionId") REFERENCES "SetTopBoxConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetTopBoxUnit" ADD CONSTRAINT "SetTopBoxUnit_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "SetTopBoxModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetTopBoxConnection" ADD CONSTRAINT "SetTopBoxConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetTopBoxConnection" ADD CONSTRAINT "SetTopBoxConnection_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "SetTopBoxModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetTopBoxConnection" ADD CONSTRAINT "SetTopBoxConnection_simId_fkey" FOREIGN KEY ("simId") REFERENCES "Sim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetTopBoxConnection" ADD CONSTRAINT "SetTopBoxConnection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "SetTopBoxUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvSubscription" ADD CONSTRAINT "TvSubscription_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SetTopBoxConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvSubscription" ADD CONSTRAINT "TvSubscription_tvPlanId_fkey" FOREIGN KEY ("tvPlanId") REFERENCES "TvPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvSubscription" ADD CONSTRAINT "TvSubscription_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallationRequest" ADD CONSTRAINT "InstallationRequest_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SetTopBoxConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

