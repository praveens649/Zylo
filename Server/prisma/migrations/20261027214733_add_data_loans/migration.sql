-- CreateEnum
CREATE TYPE "DataLoanStatus" AS ENUM ('ACTIVE', 'PARTIALLY_REPAID', 'DUE', 'REPAID', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DataLoanTransactionType" AS ENUM ('LOAN_ISSUED', 'BANK_REPAYMENT', 'RECHARGE_REPAYMENT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "DataLoan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "simId" TEXT NOT NULL,
    "originalAmountMb" INTEGER NOT NULL,
    "outstandingAmountMb" INTEGER NOT NULL,
    "status" "DataLoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "repaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataLoanTransaction" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" "DataLoanTransactionType" NOT NULL,
    "amountMb" INTEGER NOT NULL,
    "balanceAfterMb" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataLoanTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataLoan_userId_status_idx" ON "DataLoan"("userId", "status");

-- CreateIndex
CREATE INDEX "DataLoan_simId_status_idx" ON "DataLoan"("simId", "status");

-- CreateIndex
CREATE INDEX "DataLoan_status_dueAt_idx" ON "DataLoan"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataLoanTransaction_reference_key" ON "DataLoanTransaction"("reference");

-- CreateIndex
CREATE INDEX "DataLoanTransaction_loanId_processedAt_idx" ON "DataLoanTransaction"("loanId", "processedAt");

-- CreateIndex
CREATE INDEX "DataLoanTransaction_type_processedAt_idx" ON "DataLoanTransaction"("type", "processedAt");

-- AddForeignKey
ALTER TABLE "DataLoan" ADD CONSTRAINT "DataLoan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataLoan" ADD CONSTRAINT "DataLoan_simId_fkey" FOREIGN KEY ("simId") REFERENCES "Sim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataLoanTransaction" ADD CONSTRAINT "DataLoanTransaction_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "DataLoan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
