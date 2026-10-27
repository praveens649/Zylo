-- CreateEnum
CREATE TYPE "TravelEsimOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'READY_TO_ACTIVATE', 'ACTIVATED', 'COMPLETED', 'CANCELLED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "InternationalPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "destinationCountry" TEXT NOT NULL,
    "dataAllowanceMb" INTEGER NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "providerName" TEXT,
    "providerPlanCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelEsimOrder" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "internationalPlanId" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "travellerName" TEXT NOT NULL,
    "passportCountry" TEXT NOT NULL,
    "passportNumberEncrypted" TEXT NOT NULL,
    "passportExpiryDate" TIMESTAMP(3) NOT NULL,
    "status" "TravelEsimOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "activationCodeEncrypted" TEXT,
    "qrCodeDataEncrypted" TEXT,
    "activationExpiresAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "providerOrderId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelEsimOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternationalPlan_destinationCountry_isActive_idx" ON "InternationalPlan"("destinationCountry", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TravelEsimOrder_reference_key" ON "TravelEsimOrder"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "TravelEsimOrder_stripeCheckoutSessionId_key" ON "TravelEsimOrder"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelEsimOrder_stripePaymentIntentId_key" ON "TravelEsimOrder"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelEsimOrder_providerOrderId_key" ON "TravelEsimOrder"("providerOrderId");

-- CreateIndex
CREATE INDEX "TravelEsimOrder_userId_createdAt_idx" ON "TravelEsimOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TravelEsimOrder_status_createdAt_idx" ON "TravelEsimOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TravelEsimOrder_destinationCountry_departureDate_idx" ON "TravelEsimOrder"("destinationCountry", "departureDate");

-- AddForeignKey
ALTER TABLE "TravelEsimOrder" ADD CONSTRAINT "TravelEsimOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelEsimOrder" ADD CONSTRAINT "TravelEsimOrder_internationalPlanId_fkey" FOREIGN KEY ("internationalPlanId") REFERENCES "InternationalPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
