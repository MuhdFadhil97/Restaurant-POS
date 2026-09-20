/*
  Warnings:

  - You are about to drop the column `sent_at` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `sent_to_email` on the `purchase_orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "purchase_orders" DROP COLUMN "sent_at",
DROP COLUMN "sent_to_email";
