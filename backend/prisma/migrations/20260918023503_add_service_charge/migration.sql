-- AlterTable
ALTER TABLE "outlets" ADD COLUMN     "service_charge_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "service_charge_rate" DECIMAL(5,2) NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "service_charge_total" DECIMAL(12,2) NOT NULL DEFAULT 0;
