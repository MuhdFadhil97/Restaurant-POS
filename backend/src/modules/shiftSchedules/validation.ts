import { z } from "zod";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const listShiftSchedulesQuerySchema = z.object({
  outletId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
});

export const staffQuerySchema = z.object({
  outletId: z.string().uuid(),
});

export const listMyShiftSchedulesQuerySchema = z.object({
  from: z.string().regex(DATE_ONLY),
  to: z.string().regex(DATE_ONLY),
});

export const createShiftScheduleSchema = z.object({
  outletId: z.string().uuid(),
  userId: z.string().uuid(),
  shiftTemplateId: z.string().uuid(),
  date: z.string().regex(DATE_ONLY, "date must be YYYY-MM-DD"),
  notes: z.string().optional(),
});

export const updateShiftScheduleSchema = z.object({
  shiftTemplateId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type ListShiftSchedulesQuery = z.infer<typeof listShiftSchedulesQuerySchema>;
export type ListMyShiftSchedulesQuery = z.infer<typeof listMyShiftSchedulesQuerySchema>;
export type CreateShiftScheduleInput = z.infer<typeof createShiftScheduleSchema>;
export type UpdateShiftScheduleInput = z.infer<typeof updateShiftScheduleSchema>;
