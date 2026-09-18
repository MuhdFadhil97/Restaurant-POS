-- CreateEnum
CREATE TYPE "StockTakeStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "goods_received_notes" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "outlet_id" INTEGER NOT NULL,
    "received_by_user_id" INTEGER NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_received_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_received_note_items" (
    "id" SERIAL NOT NULL,
    "goods_received_note_id" INTEGER NOT NULL,
    "purchase_order_item_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant_id" INTEGER,
    "quantity_received" INTEGER NOT NULL,
    "quantity_rejected" INTEGER NOT NULL DEFAULT 0,
    "rejection_reason" TEXT,
    "unit_cost" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "goods_received_note_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_takes" (
    "id" SERIAL NOT NULL,
    "outlet_id" INTEGER NOT NULL,
    "status" "StockTakeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_by_user_id" INTEGER NOT NULL,
    "completed_by_user_id" INTEGER,
    "notes" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "stock_takes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_take_items" (
    "id" SERIAL NOT NULL,
    "stock_take_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant_id" INTEGER,
    "system_quantity" INTEGER NOT NULL,
    "counted_quantity" INTEGER,
    "notes" TEXT,

    CONSTRAINT "stock_take_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_take_items_stock_take_id_product_id_variant_id_key" ON "stock_take_items"("stock_take_id", "product_id", "variant_id");

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_received_by_user_id_fkey" FOREIGN KEY ("received_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_note_items" ADD CONSTRAINT "goods_received_note_items_goods_received_note_id_fkey" FOREIGN KEY ("goods_received_note_id") REFERENCES "goods_received_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_note_items" ADD CONSTRAINT "goods_received_note_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_note_items" ADD CONSTRAINT "goods_received_note_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_note_items" ADD CONSTRAINT "goods_received_note_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_takes" ADD CONSTRAINT "stock_takes_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_takes" ADD CONSTRAINT "stock_takes_started_by_user_id_fkey" FOREIGN KEY ("started_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_takes" ADD CONSTRAINT "stock_takes_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_take_items" ADD CONSTRAINT "stock_take_items_stock_take_id_fkey" FOREIGN KEY ("stock_take_id") REFERENCES "stock_takes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_take_items" ADD CONSTRAINT "stock_take_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_take_items" ADD CONSTRAINT "stock_take_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
