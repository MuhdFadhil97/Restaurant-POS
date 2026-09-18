-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('CLOCKED_IN', 'ON_BREAK', 'CLOCKED_OUT');

-- CreateTable
CREATE TABLE "staff_shift_templates" (
    "id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "break_minutes" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "staff_shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_shift_schedules" (
    "id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "shift_template_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_shift_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_attendances" (
    "id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "schedule_id" UUID,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'CLOCKED_IN',
    "clock_in_at" TIMESTAMP(3) NOT NULL,
    "clock_out_at" TIMESTAMP(3),
    "total_worked_minutes" INTEGER,
    "total_break_minutes" INTEGER,
    "has_compliance_issue" BOOLEAN NOT NULL DEFAULT false,
    "compliance_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_break_records" (
    "id" UUID NOT NULL,
    "attendance_id" UUID NOT NULL,
    "break_start" TIMESTAMP(3) NOT NULL,
    "break_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_break_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_shift_schedules_user_id_date_shift_template_id_key" ON "staff_shift_schedules"("user_id", "date", "shift_template_id");

-- CreateIndex
CREATE INDEX "staff_shift_schedules_outlet_id_date_idx" ON "staff_shift_schedules"("outlet_id", "date");

-- CreateIndex
CREATE INDEX "staff_shift_schedules_user_id_date_idx" ON "staff_shift_schedules"("user_id", "date");

-- CreateIndex
CREATE INDEX "staff_attendances_outlet_id_clock_in_at_idx" ON "staff_attendances"("outlet_id", "clock_in_at");

-- CreateIndex
CREATE INDEX "staff_attendances_user_id_clock_in_at_idx" ON "staff_attendances"("user_id", "clock_in_at");

-- Hand-added: enforce "at most one open attendance/break per user" at the DB
-- level via a partial unique index, so a double-click races into a Postgres
-- P2002 (already mapped to a 409 by errorHandler.ts) instead of two open rows.
CREATE UNIQUE INDEX "staff_attendances_one_open_per_user" ON "staff_attendances" ("user_id") WHERE "status" <> 'CLOCKED_OUT';

CREATE UNIQUE INDEX "staff_break_records_one_open_per_attendance" ON "staff_break_records" ("attendance_id") WHERE "break_end" IS NULL;

-- AddForeignKey
ALTER TABLE "staff_shift_templates" ADD CONSTRAINT "staff_shift_templates_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_shift_schedules" ADD CONSTRAINT "staff_shift_schedules_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_shift_schedules" ADD CONSTRAINT "staff_shift_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_shift_schedules" ADD CONSTRAINT "staff_shift_schedules_shift_template_id_fkey" FOREIGN KEY ("shift_template_id") REFERENCES "staff_shift_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_shift_schedules" ADD CONSTRAINT "staff_shift_schedules_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "staff_shift_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_break_records" ADD CONSTRAINT "staff_break_records_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "staff_attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
