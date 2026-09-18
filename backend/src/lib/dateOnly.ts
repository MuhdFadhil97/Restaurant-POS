// Builds a Date representing exactly the given calendar date at UTC midnight.
// Required for any value compared against or written into a Prisma `@db.Date`
// column: constructing the same value via a bare `new Date("YYYY-MM-DDT00:00:00")`
// (no explicit "Z") is parsed as LOCAL time, and in a positive-UTC-offset
// timezone (e.g. Malaysia, UTC+8) that shifts the value's calendar date back
// by a day once Prisma compares it against the column — verified empirically
// against this schema's `staff_shift_schedules.date` column.
export function dateOnlyUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function dateOnlyUtcEndOfDay(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999Z`);
}

// The UTC-midnight Date for a JS Date's own LOCAL calendar date (i.e. "today"
// or "yesterday" as the wall clock would call it), for filtering `@db.Date`
// columns by local calendar day.
export function localDateOnlyUtc(reference: Date, dayOffset = 0): Date {
  return new Date(Date.UTC(reference.getFullYear(), reference.getMonth(), reference.getDate() + dayOffset));
}
