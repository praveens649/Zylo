-- AlterTable
ALTER TABLE "PhoneNumber" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'IN';
ALTER TABLE "PhoneNumber" ADD COLUMN "reservedById" TEXT;
ALTER TABLE "TravelEsimOrder" ADD COLUMN "phoneNumberId" TEXT;

-- ForeignKey
ALTER TABLE "TravelEsimOrder" ADD CONSTRAINT "TravelEsimOrder_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "PhoneNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
