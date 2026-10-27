-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PlanType" ADD VALUE 'BUSINESS';
ALTER TYPE "PlanType" ADD VALUE 'VALIDITY_ONLY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SimStatus" ADD VALUE 'GRACE_PERIOD';
ALTER TYPE "SimStatus" ADD VALUE 'DEACTIVATED';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "isValidityOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Sim" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "gracePeriodEndsAt" TIMESTAMP(3),
ADD COLUMN     "planExpiredAt" TIMESTAMP(3);
