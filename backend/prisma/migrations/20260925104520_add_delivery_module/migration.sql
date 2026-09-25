-- CreateEnum
CREATE TYPE "DeliveryProvider" AS ENUM ('GRAB', 'FOODPANDA', 'DOORDASH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DeliveryOrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'READY', 'PICKED_UP', 'CANCELLED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'ONLINE';

-- AlterEnum
ALTER TYPE "TransactionOrigin" ADD VALUE 'DELIVERY';

-- CreateTable
CREATE TABLE "delivery_platforms" (
    "id" SERIAL NOT NULL,
    "outlet_id" INTEGER NOT NULL,
    "provider" "DeliveryProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "api_key_encrypted" TEXT,
    "webhook_secret_encrypted" TEXT,
    "auto_accept" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "delivery_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_orders" (
    "id" SERIAL NOT NULL,
    "outlet_id" INTEGER NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "transaction_id" INTEGER,
    "external_order_id" TEXT NOT NULL,
    "external_status" TEXT,
    "status" "DeliveryOrderStatus" NOT NULL DEFAULT 'PENDING',
    "raw_payload" JSONB NOT NULL,
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "delivery_address" TEXT,
    "courier_name" TEXT,
    "courier_phone" TEXT,
    "commission_amount" DECIMAL(12,2),
    "rejected_reason" TEXT,
    "accepted_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "picked_up_at" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_orders_transaction_id_key" ON "delivery_orders"("transaction_id");

-- CreateIndex
CREATE INDEX "delivery_orders_outlet_id_status_idx" ON "delivery_orders"("outlet_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_orders_platform_id_external_order_id_key" ON "delivery_orders"("platform_id", "external_order_id");

-- AddForeignKey
ALTER TABLE "delivery_platforms" ADD CONSTRAINT "delivery_platforms_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "delivery_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

