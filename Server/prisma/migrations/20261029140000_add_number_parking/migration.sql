-- Zylo Number Parking
-- Every statement is idempotent: the shared dev database already contains
-- parts of this feature applied outside of migrations, so all DDL is guarded
-- with IF NOT EXISTS / pg_catalog checks.

-- Parking lifecycle status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NumberParkingStatus') THEN
    CREATE TYPE "NumberParkingStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'REACTIVATED', 'CANCELLED');
  END IF;
END $$;

-- Parking order types
ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'NUMBER_PARKING';
ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'NUMBER_PARKING_EXTENSION';

-- Link orders to their parking record
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "numberParkingId" TEXT;

-- Core parking record
CREATE TABLE IF NOT EXISTS "NumberParking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "simId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "organizationId" TEXT,
    "status" "NumberParkingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "durationDays" INTEGER NOT NULL,
    "parkedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "extensionsUsed" INTEGER NOT NULL DEFAULT 0,
    "reactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NumberParking_pkey" PRIMARY KEY ("id")
);

-- Paid extension history (orderId is the idempotency anchor)
CREATE TABLE IF NOT EXISTS "NumberParkingExtension" (
    "id" TEXT NOT NULL,
    "parkingId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "previousExpiresAt" TIMESTAMP(3) NOT NULL,
    "newExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NumberParkingExtension_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "NumberParking_reference_key" ON "NumberParking"("reference");
CREATE INDEX IF NOT EXISTS "NumberParking_userId_status_idx" ON "NumberParking"("userId", "status");
CREATE INDEX IF NOT EXISTS "NumberParking_simId_status_idx" ON "NumberParking"("simId", "status");
CREATE INDEX IF NOT EXISTS "NumberParking_status_expiresAt_idx" ON "NumberParking"("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "NumberParking_organizationId_status_idx" ON "NumberParking"("organizationId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "NumberParkingExtension_orderId_key" ON "NumberParkingExtension"("orderId");
CREATE INDEX IF NOT EXISTS "NumberParkingExtension_parkingId_createdAt_idx" ON "NumberParkingExtension"("parkingId", "createdAt");

CREATE INDEX IF NOT EXISTS "Order_numberParkingId_idx" ON "Order"("numberParkingId");

-- Foreign keys (guarded so re-runs and shared-DB drift stay safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NumberParking_userId_fkey') THEN
    ALTER TABLE "NumberParking" ADD CONSTRAINT "NumberParking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NumberParking_simId_fkey') THEN
    ALTER TABLE "NumberParking" ADD CONSTRAINT "NumberParking_simId_fkey" FOREIGN KEY ("simId") REFERENCES "Sim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NumberParking_phoneNumberId_fkey') THEN
    ALTER TABLE "NumberParking" ADD CONSTRAINT "NumberParking_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "PhoneNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NumberParking_organizationId_fkey') THEN
    ALTER TABLE "NumberParking" ADD CONSTRAINT "NumberParking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BusinessOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NumberParkingExtension_parkingId_fkey') THEN
    ALTER TABLE "NumberParkingExtension" ADD CONSTRAINT "NumberParkingExtension_parkingId_fkey" FOREIGN KEY ("parkingId") REFERENCES "NumberParking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_numberParkingId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_numberParkingId_fkey" FOREIGN KEY ("numberParkingId") REFERENCES "NumberParking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
