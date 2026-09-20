-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'APPROVED';

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "line_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_rate_id" INTEGER;

-- AlterTable
-- po_number starts nullable so existing rows can be backfilled before the
-- NOT NULL + UNIQUE constraints are applied further down.
ALTER TABLE "purchase_orders" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_user_id" INTEGER,
ADD COLUMN     "discount_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "po_number" TEXT,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "sent_to_email" TEXT,
ADD COLUMN     "submitted_for_approval_at" TIMESTAMP(3),
ADD COLUMN     "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bank_account_name" TEXT,
ADD COLUMN     "bank_account_number" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "tax_registration_number" TEXT;

-- CreateTable
CREATE TABLE "supplier_products" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant_id" INTEGER,
    "supplier_sku" TEXT,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "lead_time_days" INTEGER,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_sequences" (
    "year" CHAR(4) NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_sequences_pkey" PRIMARY KEY ("year")
);

-- Backfill po_number for pre-existing rows (PO-{YYYY}-{00001}, sequential per
-- year in id order), then seed purchase_order_sequences so newly-created POs
-- continue the sequence instead of colliding with the backfilled numbers.
WITH numbered AS (
  SELECT id, to_char(created_at, 'YYYY') AS yr,
         ROW_NUMBER() OVER (PARTITION BY to_char(created_at, 'YYYY') ORDER BY id) AS rn
  FROM "purchase_orders"
)
UPDATE "purchase_orders" po
SET "po_number" = 'PO-' || numbered.yr || '-' || lpad(numbered.rn::text, 5, '0')
FROM numbered
WHERE po.id = numbered.id;

INSERT INTO "purchase_order_sequences" (year, last_number)
SELECT to_char(created_at, 'YYYY'), COUNT(*)
FROM "purchase_orders"
GROUP BY to_char(created_at, 'YYYY')
ON CONFLICT (year) DO UPDATE SET last_number = EXCLUDED.last_number;

-- AlterTable
ALTER TABLE "purchase_orders" ALTER COLUMN "po_number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_supplier_id_product_id_variant_id_key" ON "supplier_products"("supplier_id", "product_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
