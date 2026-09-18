import { buildMeta } from "../reports/export/reportMeta";
import { ReportData } from "../reports/types";
import { ReportQuery } from "../reports/validation";
import { listAttendance } from "./service";

// listAttendance expects plain YYYY-MM-DD dates (it appends its own
// T00:00:00/T23:59:59), while every report query carries full ISO datetimes.
function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export async function attendanceComplianceReport(query: ReportQuery): Promise<ReportData> {
  const { records } = await listAttendance(query.outletId, toDateOnly(query.from), toDateOnly(query.to));

  const rows = records.map((r) => ({
    staffName: r.user.name,
    clockInAt: r.clockInAt.toISOString(),
    clockOutAt: r.clockOutAt?.toISOString() ?? "",
    workedMinutes: r.totalWorkedMinutes ?? 0,
    breakMinutes: r.totalBreakMinutes ?? 0,
    hasComplianceIssue: r.hasComplianceIssue,
    complianceNotes: r.complianceNotes ?? "",
  }));

  return {
    title: "Attendance & Compliance",
    columns: [
      { key: "staffName", header: "Staff" },
      { key: "clockInAt", header: "Clock In", format: "datetime" },
      { key: "clockOutAt", header: "Clock Out", format: "datetime" },
      { key: "workedMinutes", header: "Worked (min)", format: "number" },
      { key: "breakMinutes", header: "Break (min)", format: "number" },
      { key: "hasComplianceIssue", header: "Issue?" },
      { key: "complianceNotes", header: "Notes" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

export async function staffOvertimeReport(query: ReportQuery): Promise<ReportData> {
  const { weeklyCompliance } = await listAttendance(query.outletId, toDateOnly(query.from), toDateOnly(query.to));

  const rows = weeklyCompliance.map((w) => ({
    staffName: w.userName,
    weekStart: w.weekStart,
    workedHours: w.workedHours,
    overtimeHours: Math.max(0, Math.round((w.workedHours - 45) * 10) / 10),
    daysWorked: w.daysWorked,
    exceedsWeeklyHours: w.exceedsWeeklyHours,
  }));

  return {
    title: "Staff Hours & Overtime Summary",
    columns: [
      { key: "staffName", header: "Staff" },
      { key: "weekStart", header: "Week Starting", format: "date" },
      { key: "workedHours", header: "Worked Hours", format: "number" },
      { key: "overtimeHours", header: "Overtime Hours", format: "number" },
      { key: "daysWorked", header: "Days Worked", format: "number" },
      { key: "exceedsWeeklyHours", header: "Exceeds 45h?" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

export async function complianceExceptionsReport(query: ReportQuery): Promise<ReportData> {
  const { records } = await listAttendance(query.outletId, toDateOnly(query.from), toDateOnly(query.to));
  const exceptions = records.filter((r) => r.hasComplianceIssue);

  const rows = exceptions.map((r) => ({
    staffName: r.user.name,
    clockInAt: r.clockInAt.toISOString(),
    clockOutAt: r.clockOutAt?.toISOString() ?? "",
    complianceNotes: r.complianceNotes ?? "",
  }));

  return {
    title: "Compliance Exceptions",
    columns: [
      { key: "staffName", header: "Staff" },
      { key: "clockInAt", header: "Clock In", format: "datetime" },
      { key: "clockOutAt", header: "Clock Out", format: "datetime" },
      { key: "complianceNotes", header: "Notes" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}
