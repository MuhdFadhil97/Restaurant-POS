-- CreateEnum
CREATE TYPE "TableShape" AS ENUM ('ROUND', 'RECTANGLE');

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "pos_x" INTEGER,
ADD COLUMN     "pos_y" INTEGER,
ADD COLUMN     "reserved_at" TIMESTAMP(3),
ADD COLUMN     "reserved_for" TEXT,
ADD COLUMN     "reserved_party_size" INTEGER,
ADD COLUMN     "shape" "TableShape",
ADD COLUMN     "width" INTEGER;
