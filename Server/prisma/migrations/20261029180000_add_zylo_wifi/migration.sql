-- CreateEnum
CREATE TYPE "WifiBand" AS ENUM ('SINGLE_BAND', 'DUAL_BAND', 'TRI_BAND');

-- CreateEnum
CREATE TYPE "WifiUnitStatus" AS ENUM ('IN_STOCK', 'RESERVED', 'ASSIGNED', 'INSTALLED', 'FAULTY', 'RETURNED', 'RETIRED');

-- CreateEnum
CREATE TYPE "DeviceOwnership" AS ENUM ('PURCHASE', 'RENTAL');

-- CreateEnum
CREATE TYPE "WifiConnectionStatus" AS ENUM ('PENDING_INSTALLATION', 'ACTIVE', 'PAUSED', 'GRACE_PERIOD', 'SUSPENDED', 'DISCONNECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WifiPlanType" AS ENUM ('BASE', 'ADD_ON');

-- CreateEnum
CREATE TYPE "WifiSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderType" ADD VALUE 'WIFI_ORDER';
ALTER TYPE "OrderType" ADD VALUE 'WIFI_PLAN_PURCHASE';

-- AlterEnum
ALTER TYPE "SupportCategory" ADD VALUE 'WIFI';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "wifiConnectionId" TEXT,
ADD COLUMN     "wifiDeviceId" TEXT,
ADD COLUMN     "wifiPlanId" TEXT;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "wifiConnectionId" TEXT;

-- CreateTable
CREATE TABLE "WifiDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "band" "WifiBand" NOT NULL DEFAULT 'DUAL_BAND',
    "wifiStandard" TEXT NOT NULL DEFAULT 'Wi-Fi 5',
    "maxDevices" INTEGER NOT NULL DEFAULT 32,
    "ethernetPorts" INTEGER NOT NULL DEFAULT 4,
    "isMesh" BOOLEAN NOT NULL DEFAULT false,
    "imageFileId" TEXT,
    "purchasePrice" DECIMAL(10,2),
    "rentalPerMonth" DECIMAL(10,2),
    "securityDeposit" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WifiDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WifiDeviceUnit" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "macAddress" TEXT NOT NULL,
    "status" "WifiUnitStatus" NOT NULL DEFAULT 'IN_STOCK',
    "warrantyEndsAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WifiDeviceUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WifiConnection" (
    "id" TEXT NOT NULL,
    "connectionNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "simId" TEXT,
    "unitId" TEXT,
    "ownership" "DeviceOwnership" NOT NULL DEFAULT 'PURCHASE',
    "status" "WifiConnectionStatus" NOT NULL DEFAULT 'PENDING_INSTALLATION',
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
    "pauseDaysUsed" INTEGER NOT NULL DEFAULT 0,
    "pauseWindowStartedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "returnDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WifiConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WifiPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "WifiPlanType" NOT NULL DEFAULT 'BASE',
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'inr',
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "speedMbps" INTEGER NOT NULL,
    "dataLimitGb" INTEGER,
    "postFupSpeedMbps" INTEGER,
    "requiresTriBand" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WifiPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WifiSubscription" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "wifiPlanId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "WifiSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WifiSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WifiInstallation" (
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

    CONSTRAINT "WifiInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WifiDevice_name_key" ON "WifiDevice"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WifiDevice_sku_key" ON "WifiDevice"("sku");

-- CreateIndex
CREATE INDEX "WifiDevice_isActive_band_idx" ON "WifiDevice"("isActive", "band");

-- CreateIndex
CREATE UNIQUE INDEX "WifiDeviceUnit_serialNumber_key" ON "WifiDeviceUnit"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WifiDeviceUnit_macAddress_key" ON "WifiDeviceUnit"("macAddress");

-- CreateIndex
CREATE INDEX "WifiDeviceUnit_deviceId_status_idx" ON "WifiDeviceUnit"("deviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WifiConnection_connectionNumber_key" ON "WifiConnection"("connectionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WifiConnection_unitId_key" ON "WifiConnection"("unitId");

-- CreateIndex
CREATE INDEX "WifiConnection_userId_status_idx" ON "WifiConnection"("userId", "status");

-- CreateIndex
CREATE INDEX "WifiConnection_status_planExpiredAt_idx" ON "WifiConnection"("status", "planExpiredAt");

-- CreateIndex
CREATE INDEX "WifiConnection_simId_idx" ON "WifiConnection"("simId");

-- CreateIndex
CREATE UNIQUE INDEX "WifiPlan_name_key" ON "WifiPlan"("name");

-- CreateIndex
CREATE INDEX "WifiPlan_type_isActive_idx" ON "WifiPlan"("type", "isActive");

-- CreateIndex
CREATE INDEX "WifiPlan_price_idx" ON "WifiPlan"("price");

-- CreateIndex
CREATE UNIQUE INDEX "WifiSubscription_orderId_key" ON "WifiSubscription"("orderId");

-- CreateIndex
CREATE INDEX "WifiSubscription_connectionId_status_idx" ON "WifiSubscription"("connectionId", "status");

-- CreateIndex
CREATE INDEX "WifiSubscription_status_endDate_idx" ON "WifiSubscription"("status", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "WifiInstallation_reference_key" ON "WifiInstallation"("reference");

-- CreateIndex
CREATE INDEX "WifiInstallation_connectionId_status_idx" ON "WifiInstallation"("connectionId", "status");

-- CreateIndex
CREATE INDEX "WifiInstallation_status_scheduledAt_idx" ON "WifiInstallation"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Order_wifiConnectionId_idx" ON "Order"("wifiConnectionId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_wifiDeviceId_fkey" FOREIGN KEY ("wifiDeviceId") REFERENCES "WifiDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_wifiPlanId_fkey" FOREIGN KEY ("wifiPlanId") REFERENCES "WifiPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_wifiConnectionId_fkey" FOREIGN KEY ("wifiConnectionId") REFERENCES "WifiConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_wifiConnectionId_fkey" FOREIGN KEY ("wifiConnectionId") REFERENCES "WifiConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiDeviceUnit" ADD CONSTRAINT "WifiDeviceUnit_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "WifiDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiConnection" ADD CONSTRAINT "WifiConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiConnection" ADD CONSTRAINT "WifiConnection_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "WifiDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiConnection" ADD CONSTRAINT "WifiConnection_simId_fkey" FOREIGN KEY ("simId") REFERENCES "Sim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiConnection" ADD CONSTRAINT "WifiConnection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "WifiDeviceUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiSubscription" ADD CONSTRAINT "WifiSubscription_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "WifiConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiSubscription" ADD CONSTRAINT "WifiSubscription_wifiPlanId_fkey" FOREIGN KEY ("wifiPlanId") REFERENCES "WifiPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiSubscription" ADD CONSTRAINT "WifiSubscription_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiInstallation" ADD CONSTRAINT "WifiInstallation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "WifiConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
