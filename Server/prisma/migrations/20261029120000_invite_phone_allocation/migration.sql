ALTER TABLE "BusinessInvite" ADD COLUMN "phoneNumberId" TEXT;

ALTER TABLE "BusinessInvite" ADD CONSTRAINT "BusinessInvite_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "PhoneNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "BusinessInvite_phoneNumberId_idx" ON "BusinessInvite"("phoneNumberId");
