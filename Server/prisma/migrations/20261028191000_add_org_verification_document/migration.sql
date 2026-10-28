-- AlterTable
ALTER TABLE "BusinessOrganization" ADD COLUMN "verificationDocumentId" TEXT;

-- AddForeignKey
ALTER TABLE "BusinessOrganization" ADD CONSTRAINT "BusinessOrganization_verificationDocumentId_fkey" FOREIGN KEY ("verificationDocumentId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
