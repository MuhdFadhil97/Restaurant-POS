-- CreateEnum
CREATE TYPE "EInvoiceStatus" AS ENUM ('NOT_APPLICABLE', 'GENERATED', 'CANCELLED');

-- AlterTable
ALTER TABLE "outlets" ADD COLUMN     "einvoice_brn" TEXT,
ADD COLUMN     "einvoice_msic_code" TEXT,
ADD COLUMN     "einvoice_sst_no" TEXT,
ADD COLUMN     "einvoice_tin" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "einvoice_generated_at" TIMESTAMP(3),
ADD COLUMN     "einvoice_long_id" TEXT,
ADD COLUMN     "einvoice_status" "EInvoiceStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
ADD COLUMN     "einvoice_uuid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_einvoice_uuid_key" ON "transactions"("einvoice_uuid");
