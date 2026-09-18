-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "receipt_number" TEXT;

-- CreateTable
CREATE TABLE "receipt_sequences" (
    "date" CHAR(8) NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "receipt_sequences_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_receipt_number_key" ON "transactions"("receipt_number");
