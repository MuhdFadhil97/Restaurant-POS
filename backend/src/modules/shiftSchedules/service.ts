import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { dateOnlyUtc, dateOnlyUtcEndOfDay } from "../../lib/dateOnly";
import { shiftsOverlap } from "../staffAttendance/complianceRules";
import { CreateShiftScheduleInput, UpdateShiftScheduleInput } from "./validation";

const detailInclude = {
  shiftTemplate: true,
  user: { select: { id: true, name: true, role: true } },
};

function monthRange(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const from = new Date(Date.UTC(year, mon - 1, 1));
  const to = new Date(Date.UTC(year, mon, 0)); // last day of the month
  return { from, to };
}

// Staff assignable to this outlet's roster (ADMIN/MANAGER building the
// monthly grid need this, but the full /users list is ADMIN-only).
export async function listStaffForOutlet(outletId: number) {
  const access = await prisma.userOutlet.findMany({
    where: { outletId, user: { deletedAt: null, isActive: true } },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return access.map((a) => a.user);
}

export async function listShiftSchedulesForMonth(outletId: number, month: string) {
  const { from, to } = monthRange(month);
  return prisma.staffShiftSchedule.findMany({
    where: { outletId, date: { gte: from, lte: to } },
    include: detailInclude,
    orderBy: { date: "asc" },
  });
}

export async function listMySchedules(userId: number, from: string, to: string) {
  return prisma.staffShiftSchedule.findMany({
    where: { userId, date: { gte: dateOnlyUtc(from), lte: dateOnlyUtcEndOfDay(to) } },
    include: detailInclude,
    orderBy: { date: "asc" },
  });
}

// Assigning a shift never blocks on overlap (warn-only philosophy) — the
// caller gets an `overlapWarning` back to surface in the UI.
export async function createShiftSchedule(createdByUserId: number, input: CreateShiftScheduleInput) {
  const template = await prisma.staffShiftTemplate.findFirst({
    where: { id: input.shiftTemplateId, outletId: input.outletId, deletedAt: null },
  });
  if (!template) throw ApiError.notFound("Shift template not found for this outlet");

  const date = dateOnlyUtc(input.date);

  const sameDay = await prisma.staffShiftSchedule.findMany({
    where: { userId: input.userId, date },
    include: { shiftTemplate: true },
  });
  const overlaps = sameDay.some((s) => shiftsOverlap(s.shiftTemplate, template));

  const schedule = await prisma.staffShiftSchedule.create({
    data: {
      outletId: input.outletId,
      userId: input.userId,
      shiftTemplateId: input.shiftTemplateId,
      date,
      notes: input.notes,
      createdByUserId,
    },
    include: detailInclude,
  });

  return {
    schedule,
    overlapWarning: overlaps
      ? "This assignment overlaps another shift already scheduled for this person on this day."
      : null,
  };
}

export async function updateShiftSchedule(id: number, input: UpdateShiftScheduleInput) {
  const existing = await prisma.staffShiftSchedule.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Schedule entry not found");
  return prisma.staffShiftSchedule.update({ where: { id }, data: input, include: detailInclude });
}

export async function deleteShiftSchedule(id: number) {
  const existing = await prisma.staffShiftSchedule.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Schedule entry not found");
  await prisma.staffShiftSchedule.delete({ where: { id } });
}
