-- CreateEnum
CREATE TYPE "AccountingExportFormat" AS ENUM ('QUICKBOOKS_CSV', 'XERO_CSV', 'GENERIC_CSV');

-- CreateEnum
CREATE TYPE "AccountingExportStatus" AS ENUM ('COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "product_categories" ADD COLUMN     "accounting_category" TEXT;

-- CreateTable
CREATE TABLE "accounting_export_runs" (
    "id" SERIAL NOT NULL,
    "outlet_id" INTEGER NOT NULL,
    "format" "AccountingExportFormat" NOT NULL,
    "status" "AccountingExportStatus" NOT NULL DEFAULT 'COMPLETED',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "file_url" TEXT,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "requested_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_export_runs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "accounting_export_runs" ADD CONSTRAINT "accounting_export_runs_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_export_runs" ADD CONSTRAINT "accounting_export_runs_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

