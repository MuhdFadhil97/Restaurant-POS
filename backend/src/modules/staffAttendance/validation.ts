import { z } from "zod";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const clockInSchema = z.object({
  outletId: z.coerce.number().int(),
  scheduleId: z.coerce.number().int().optional(),
});

export const listMyAttendanceQuerySchema = z.object({
  from: z.string().regex(DATE_ONLY),
  to: z.string().regex(DATE_ONLY),
});

export const listAttendanceQuerySchema = z.object({
  outletId: z.coerce.number().int(),
  from: z.string().regex(DATE_ONLY),
  to: z.string().regex(DATE_ONLY),
});

export const correctAttendanceSchema = z.object({
  clockInAt: z.string().datetime().optional(),
  clockOutAt: z.string().datetime().nullable().optional(),
});

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ListMyAttendanceQuery = z.infer<typeof listMyAttendanceQuerySchema>;
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;
export type CorrectAttendanceInput = z.infer<typeof correctAttendanceSchema>;
