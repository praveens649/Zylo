-- CreateEnum
CREATE TYPE "DataBankTransactionType" AS ENUM ('DEPOSIT', 'REDEMPTION', 'EXPIRY', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "DataTransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DataTransferRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "dataBankEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dataTransferEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rolloverExpiryDays" INTEGER,
ADD COLUMN     "rolloverLimitMb" INTEGER,
ADD COLUMN     "transferLimitMb" INTEGER;

-- CreateTable
CREATE TABLE "DataBankAccount" (
    "id" TEXT NOT NULL,
    "simId" TEXT NOT NULL,
    "balanceMb" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataBankTransaction" (
    "id" TEXT NOT NULL,
    "dataBankId" TEXT NOT NULL,
    "type" "DataBankTransactionType" NOT NULL,
    "amountMb" INTEGER NOT NULL,
    "balanceAfterMb" INTEGER NOT NULL,
    "description" TEXT,
    "reference" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataBankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataTransfer" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "fromSimId" TEXT NOT NULL,
    "toSimId" TEXT NOT NULL,
    "amountMb" INTEGER NOT NULL,
    "status" "DataTransferStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "failureReason" TEXT,
    "idempotencyKey" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataTransferRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "requesterSimId" TEXT NOT NULL,
    "recipientSimId" TEXT NOT NULL,
    "amountMb" INTEGER NOT NULL,
    "message" TEXT,
    "status" "DataTransferRequestStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataTransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataBankAccount_simId_key" ON "DataBankAccount"("simId");

-- CreateIndex
CREATE INDEX "DataBankAccount_balanceMb_idx" ON "DataBankAccount"("balanceMb");

-- CreateIndex
CREATE UNIQUE INDEX "DataBankTransaction_reference_key" ON "DataBankTransaction"("reference");

-- CreateIndex
CREATE INDEX "DataBankTransaction_dataBankId_processedAt_idx" ON "DataBankTransaction"("dataBankId", "processedAt");

-- CreateIndex
CREATE INDEX "DataBankTransaction_type_processedAt_idx" ON "DataBankTransaction"("type", "processedAt");

-- CreateIndex
CREATE INDEX "DataBankTransaction_expiresAt_idx" ON "DataBankTransaction"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataTransfer_reference_key" ON "DataTransfer"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "DataTransfer_idempotencyKey_key" ON "DataTransfer"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DataTransfer_fromSimId_createdAt_idx" ON "DataTransfer"("fromSimId", "createdAt");

-- CreateIndex
CREATE INDEX "DataTransfer_toSimId_createdAt_idx" ON "DataTransfer"("toSimId", "createdAt");

-- CreateIndex
CREATE INDEX "DataTransfer_status_createdAt_idx" ON "DataTransfer"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataTransferRequest_reference_key" ON "DataTransferRequest"("reference");

-- CreateIndex
CREATE INDEX "DataTransferRequest_requesterSimId_status_idx" ON "DataTransferRequest"("requesterSimId", "status");

-- CreateIndex
CREATE INDEX "DataTransferRequest_recipientSimId_status_idx" ON "DataTransferRequest"("recipientSimId", "status");

-- AddForeignKey
ALTER TABLE "DataBankAccount" ADD CONSTRAINT "DataBankAccount_simId_fkey" FOREIGN KEY ("simId") REFERENCES "Sim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataBankTransaction" ADD CONSTRAINT "DataBankTransaction_dataBankId_fkey" FOREIGN KEY ("dataBankId") REFERENCES "DataBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataTransfer" ADD CONSTRAINT "DataTransfer_fromSimId_fkey" FOREIGN KEY ("fromSimId") REFERENCES "Sim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataTransfer" ADD CONSTRAINT "DataTransfer_toSimId_fkey" FOREIGN KEY ("toSimId") REFERENCES "Sim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataTransferRequest" ADD CONSTRAINT "DataTransferRequest_requesterSimId_fkey" FOREIGN KEY ("requesterSimId") REFERENCES "Sim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataTransferRequest" ADD CONSTRAINT "DataTransferRequest_recipientSimId_fkey" FOREIGN KEY ("recipientSimId") REFERENCES "Sim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
