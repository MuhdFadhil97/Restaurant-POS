// Malaysia Employment Act 1955 (as amended 2022) standard-practice constants.
// These are deliberately NOT admin-configurable — the module follows the
// standard, it doesn't let anyone tune it per outlet.
export const MAX_CONSECUTIVE_HOURS_BEFORE_BREAK = 5;
export const MIN_BREAK_MINUTES = 30;
export const STANDARD_DAILY_HOURS = 8;
export const MAX_WEEKLY_HOURS = 45; // 2022 amendment, down from 48
export const MIN_REST_DAYS_PER_WEEK = 1;
// Hard sanity cap enforced at StaffShiftTemplate create/update time only —
// a data-integrity guard against fat-fingered entry, not a labor-rule block.
export const MAX_SINGLE_SHIFT_HOURS = 12;

export const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

interface BreakWindow {
  breakStart: Date;
  breakEnd: Date | null;
}

export interface ComplianceResult {
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  hasComplianceIssue: boolean;
  complianceNotes: string | null;
}

function diffMinutes(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

// Computes worked/break totals and flags Malaysia-standard compliance issues
// (warn-only — never used to block an action, only to annotate the record).
// Called once at clock-out, and again whenever an admin corrects a record.
export function evaluateCompliance(params: { clockInAt: Date; clockOutAt: Date; breaks: BreakWindow[] }): ComplianceResult {
  const { clockInAt, clockOutAt, breaks } = params;

  // An open break at clock-out time (shouldn't normally happen — the service
  // layer closes any dangling break first) is treated as ending at clock-out.
  const closedBreaks = breaks
    .map((b) => ({ breakStart: b.breakStart, breakEnd: b.breakEnd ?? clockOutAt }))
    .sort((a, b) => a.breakStart.getTime() - b.breakStart.getTime());

  const totalBreakMinutes = closedBreaks.reduce((sum, b) => sum + diffMinutes(b.breakStart, b.breakEnd), 0);
  const grossMinutes = diffMinutes(clockInAt, clockOutAt);
  const totalWorkedMinutes = Math.max(0, grossMinutes - totalBreakMinutes);

  // Longest continuous work stretch between break boundaries.
  let longestStretchMinutes = 0;
  let cursor = clockInAt;
  for (const b of closedBreaks) {
    longestStretchMinutes = Math.max(longestStretchMinutes, diffMinutes(cursor, b.breakStart));
    cursor = b.breakEnd;
  }
  longestStretchMinutes = Math.max(longestStretchMinutes, diffMinutes(cursor, clockOutAt));

  const notes: string[] = [];

  if (longestStretchMinutes > MAX_CONSECUTIVE_HOURS_BEFORE_BREAK * 60) {
    notes.push(
      `Worked ${formatMinutes(longestStretchMinutes)} continuously without a break (Malaysia Employment Act requires a break after ${MAX_CONSECUTIVE_HOURS_BEFORE_BREAK} consecutive hours).`
    );
  }

  if (totalWorkedMinutes > STANDARD_DAILY_HOURS * 60) {
    const overMinutes = totalWorkedMinutes - STANDARD_DAILY_HOURS * 60;
    notes.push(
      `Worked ${formatMinutes(totalWorkedMinutes)} today — ${formatMinutes(overMinutes)} over the standard ${STANDARD_DAILY_HOURS}-hour day (overtime).`
    );
  }

  if (
    totalBreakMinutes > 0 &&
    totalBreakMinutes < MIN_BREAK_MINUTES &&
    longestStretchMinutes > MAX_CONSECUTIVE_HOURS_BEFORE_BREAK * 60
  ) {
    notes.push(
      `Total break time (${formatMinutes(totalBreakMinutes)}) is under the ${MIN_BREAK_MINUTES}-minute minimum required after a long stretch.`
    );
  }

  return {
    totalWorkedMinutes,
    totalBreakMinutes,
    hasComplianceIssue: notes.length > 0,
    complianceNotes: notes.length > 0 ? notes.join(" ") : null,
  };
}

// Duration of a shift template's window in hours, treating endTime <=
// startTime as crossing midnight (overnight shift).
export function shiftDurationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

export interface ScheduleCandidate {
  id: number;
  date: Date;
  shiftTemplate: { startTime: string; endTime: string };
}

const CLOCK_IN_GRACE_MINUTES = 120;

function parseTimeOnDate(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setHours(h, m, 0, 0);
  return d;
}

// Finds which schedule row `now` falls under, accounting for overnight
// shifts (endTime <= startTime crosses midnight, so a schedule dated
// "yesterday" can still be the right match for a just-after-midnight
// clock-in). Candidates should already be narrowed to today/yesterday for
// this user+outlet before calling.
export function findMatchingSchedule(candidates: ScheduleCandidate[], now: Date): ScheduleCandidate | null {
  for (const candidate of candidates) {
    const start = parseTimeOnDate(candidate.date, candidate.shiftTemplate.startTime);
    let end = parseTimeOnDate(candidate.date, candidate.shiftTemplate.endTime);
    if (end.getTime() <= start.getTime()) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    const windowStart = new Date(start.getTime() - CLOCK_IN_GRACE_MINUTES * 60000);
    const windowEnd = new Date(end.getTime() + CLOCK_IN_GRACE_MINUTES * 60000);
    if (now >= windowStart && now <= windowEnd) {
      return candidate;
    }
  }
  return null;
}

// True if a shift template's start/end window (on a given calendar day)
// overlaps another already-assigned template's window for the same person.
// Used to warn (never block) about accidental double-booking in the roster.
export function shiftsOverlap(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string }
): boolean {
  const refDate = new Date(2000, 0, 1);
  const aStart = parseTimeOnDate(refDate, a.startTime);
  let aEnd = parseTimeOnDate(refDate, a.endTime);
  if (aEnd.getTime() <= aStart.getTime()) aEnd = new Date(aEnd.getTime() + 24 * 60 * 60 * 1000);
  const bStart = parseTimeOnDate(refDate, b.startTime);
  let bEnd = parseTimeOnDate(refDate, b.endTime);
  if (bEnd.getTime() <= bStart.getTime()) bEnd = new Date(bEnd.getTime() + 24 * 60 * 60 * 1000);
  return aStart < bEnd && bStart < aEnd;
}
