-- AlterTable
ALTER TABLE "users" ADD COLUMN     "module_access_customized" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "user_module_access" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "module_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_module_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_module_access_user_id_module_key_key" ON "user_module_access"("user_id", "module_key");

-- AddForeignKey
ALTER TABLE "user_module_access" ADD CONSTRAINT "user_module_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

