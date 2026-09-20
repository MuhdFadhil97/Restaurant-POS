-- CreateEnum
CREATE TYPE "TransactionOrigin" AS ENUM ('POS', 'QR');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SYSTEM';

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "qr_token" TEXT,
ADD COLUMN     "qr_token_rotated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "origin" "TransactionOrigin" NOT NULL DEFAULT 'POS';

-- CreateIndex
CREATE UNIQUE INDEX "tables_qr_token_key" ON "tables"("qr_token");

