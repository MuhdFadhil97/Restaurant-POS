import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { localDateOnlyUtc } from "../../lib/dateOnly";
import { evaluateCompliance, findMatchingSchedule, MAX_WEEKLY_HOURS } from "./complianceRules";
import { ClockInInput, CorrectAttendanceInput } from "./validation";

const detailInclude = {
  schedule: { include: { shiftTemplate: true } },
  breaks: true,
  user: { select: { id: true, name: true, role: true } },
};

export async function getCurrentAttendance(userId: string) {
  return prisma.staffAttendance.findFirst({
    where: { userId, status: { not: "CLOCKED_OUT" } },
    include: detailInclude,
  });
}

// Mirrors cashSessions.openSession's "check no existing open row, else
// create" shape. The partial unique index in the migration backs this up
// against a double-click race (surfaces as a 409 via errorHandler's P2002
// mapping, not a second open row).
export async function clockIn(userId: string, input: ClockInInput) {
  const existing = await getCurrentAttendance(userId);
  if (existing) {
    throw ApiError.conflict("You are already clocked in");
  }

  const now = new Date();
  let scheduleId = input.scheduleId ?? null;

  if (!scheduleId) {
    const yesterday = localDateOnlyUtc(now, -1);
    const today = localDateOnlyUtc(now);
    const candidates = await prisma.staffShiftSchedule.findMany({
      where: { userId, outletId: input.outletId, date: { gte: yesterday, lte: today } },
      include: { shiftTemplate: true },
      orderBy: { date: "asc" },
    });
    scheduleId = findMatchingSchedule(candidates, now)?.id ?? null;
  }

  try {
    return await prisma.staffAttendance.create({
      data: { userId, outletId: input.outletId, scheduleId, clockInAt: now },
      include: detailInclude,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw ApiError.conflict("You are already clocked in");
    }
    throw err;
  }
}

export async function startBreak(userId: string) {
  const attendance = await getCurrentAttendance(userId);
  if (!attendance) throw ApiError.badRequest("You are not clocked in");
  if (attendance.status === "ON_BREAK") throw ApiError.conflict("You are already on break");

  try {
    await prisma.staffBreakRecord.create({ data: { attendanceId: attendance.id, breakStart: new Date() } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw ApiError.conflict("You are already on break");
    }
    throw err;
  }

  return prisma.staffAttendance.update({
    where: { id: attendance.id },
    data: { status: "ON_BREAK" },
    include: detailInclude,
  });
}

export async function endBreak(userId: string) {
  const attendance = await getCurrentAttendance(userId);
  if (!attendance) throw ApiError.badRequest("You are not clocked in");
  const openBreak = attendance.breaks.find((b) => !b.breakEnd);
  if (!openBreak) throw ApiError.badRequest("You are not on break");

  await prisma.staffBreakRecord.update({ where: { id: openBreak.id }, data: { breakEnd: new Date() } });
  return prisma.staffAttendance.update({
    where: { id: attendance.id },
    data: { status: "CLOCKED_IN" },
    include: detailInclude,
  });
}

// Mirrors cashSessions.closeSession's "recompute derived totals server-side
// at close time" shape.
export async function clockOut(userId: string) {
  const attendance = await getCurrentAttendance(userId);
  if (!attendance) throw ApiError.badRequest("You are not clocked in");

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const openBreak = attendance.breaks.find((b) => !b.breakEnd);
    if (openBreak) {
      await tx.staffBreakRecord.update({ where: { id: openBreak.id }, data: { breakEnd: now } });
    }

    const breaks = await tx.staffBreakRecord.findMany({ where: { attendanceId: attendance.id } });
    const compliance = evaluateCompliance({ clockInAt: attendance.clockInAt, clockOutAt: now, breaks });

    return tx.staffAttendance.update({
      where: { id: attendance.id },
      data: {
        status: "CLOCKED_OUT",
        clockOutAt: now,
        totalWorkedMinutes: compliance.totalWorkedMinutes,
        totalBreakMinutes: compliance.totalBreakMinutes,
        hasComplianceIssue: compliance.hasComplianceIssue,
        complianceNotes: compliance.complianceNotes,
      },
      include: detailInclude,
    });
  });
}

export async function listMyAttendance(userId: string, from: string, to: string) {
  return prisma.staffAttendance.findMany({
    where: { userId, clockInAt: { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59`) } },
    include: detailInclude,
    orderBy: { clockInAt: "desc" },
  });
}

export async function listAttendance(outletId: string, from: string, to: string) {
  const records = await prisma.staffAttendance.findMany({
    where: { outletId, clockInAt: { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59`) } },
    include: detailInclude,
    orderBy: { clockInAt: "desc" },
  });

  return { records, weeklyCompliance: computeWeeklyCompliance(records) };
}

function isoWeekStart(date: Date): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// Weekly rest-day (>=1 per 7 days) and weekly-hours (45h) compliance need
// cross-day aggregation, so they're derived here from actual attendance
// records rather than persisted per-row.
function computeWeeklyCompliance(
  records: { userId: string; user: { name: string }; clockInAt: Date; totalWorkedMinutes: number | null }[]
) {
  const byUserWeek = new Map<
    string,
    { userId: string; userName: string; weekStart: string; workedMinutes: number; days: Set<string> }
  >();

  for (const r of records) {
    const weekStart = isoWeekStart(r.clockInAt);
    const key = `${r.userId}_${weekStart}`;
    const dayKey = r.clockInAt.toISOString().slice(0, 10);
    const entry = byUserWeek.get(key) ?? {
      userId: r.userId,
      userName: r.user.name,
      weekStart,
      workedMinutes: 0,
      days: new Set<string>(),
    };
    entry.workedMinutes += r.totalWorkedMinutes ?? 0;
    entry.days.add(dayKey);
    byUserWeek.set(key, entry);
  }

  return Array.from(byUserWeek.values()).map((entry) => ({
    userId: entry.userId,
    userName: entry.userName,
    weekStart: entry.weekStart,
    workedHours: Math.round((entry.workedMinutes / 60) * 10) / 10,
    daysWorked: entry.days.size,
    hasNoRestDay: entry.days.size >= 7,
    exceedsWeeklyHours: entry.workedMinutes > MAX_WEEKLY_HOURS * 60,
  }));
}

// Admin/manager correction for a stuck or forgotten clock-out. Re-runs the
// same compliance evaluation used at ordinary clock-out (single call site).
export async function correctAttendance(actorUserId: string, id: string, input: CorrectAttendanceInput) {
  const attendance = await prisma.staffAttendance.findUnique({ where: { id }, include: { breaks: true } });
  if (!attendance) throw ApiError.notFound("Attendance record not found");

  return prisma.$transaction(async (tx) => {
    const clockInAt = input.clockInAt ? new Date(input.clockInAt) : attendance.clockInAt;
    const clockOutAt =
      input.clockOutAt === undefined ? attendance.clockOutAt : input.clockOutAt ? new Date(input.clockOutAt) : null;

    let compliancePatch: Partial<{
      totalWorkedMinutes: number;
      totalBreakMinutes: number;
      hasComplianceIssue: boolean;
      complianceNotes: string | null;
    }> = {};
    let status = attendance.status;

    if (clockOutAt) {
      const compliance = evaluateCompliance({ clockInAt, clockOutAt, breaks: attendance.breaks });
      compliancePatch = compliance;
      status = "CLOCKED_OUT";
    }

    const updated = await tx.staffAttendance.update({
      where: { id },
      data: { clockInAt, clockOutAt, status, ...compliancePatch },
      include: detailInclude,
    });

    await recordAudit(tx, {
      userId: actorUserId,
      action: "STAFF_ATTENDANCE_CORRECTED",
      entityType: "StaffAttendance",
      entityId: id,
      outletId: attendance.outletId,
      details: {
        before: { clockInAt: attendance.clockInAt, clockOutAt: attendance.clockOutAt },
        after: { clockInAt, clockOutAt },
      },
    });

    return updated;
  });
}
