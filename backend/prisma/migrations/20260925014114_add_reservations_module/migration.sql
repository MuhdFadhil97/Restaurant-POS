-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('STAFF', 'ONLINE', 'PHONE');

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "outlet_id" INTEGER NOT NULL,
    "table_id" INTEGER,
    "customer_id" INTEGER,
    "customer_name" TEXT NOT NULL,
    "phone" TEXT,
    "party_size" INTEGER NOT NULL,
    "reserved_for" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 90,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "source" "ReservationSource" NOT NULL DEFAULT 'STAFF',
    "deposit_amount" DECIMAL(12,2),
    "deposit_collected_at" TIMESTAMP(3),
    "notes" TEXT,
    "transaction_id" INTEGER,
    "cancelled_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservations_transaction_id_key" ON "reservations"("transaction_id");

-- CreateIndex
CREATE INDEX "reservations_outlet_id_reserved_for_idx" ON "reservations"("outlet_id", "reserved_for");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

