-- CreateEnum
CREATE TYPE "CustomerSource" AS ENUM ('WALK_IN', 'SOCIAL_MEDIA', 'REFERRAL', 'THIRD_PARTY', 'ONLINE');

-- AlterTable
ALTER TABLE "customers"
  ADD COLUMN "identification_no" TEXT,
  ADD COLUMN "date_of_birth" DATE,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "source" "CustomerSource";
