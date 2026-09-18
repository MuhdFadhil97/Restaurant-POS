import { z } from "zod";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const listShiftSchedulesQuerySchema = z.object({
  outletId: z.coerce.number().int(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
});

export const staffQuerySchema = z.object({
  outletId: z.coerce.number().int(),
});

export const listMyShiftSchedulesQuerySchema = z.object({
  from: z.string().regex(DATE_ONLY),
  to: z.string().regex(DATE_ONLY),
});

export const createShiftScheduleSchema = z.object({
  outletId: z.coerce.number().int(),
  userId: z.coerce.number().int(),
  shiftTemplateId: z.coerce.number().int(),
  date: z.string().regex(DATE_ONLY, "date must be YYYY-MM-DD"),
  notes: z.string().optional(),
});

export const updateShiftScheduleSchema = z.object({
  shiftTemplateId: z.coerce.number().int().optional(),
  notes: z.string().optional(),
});

export type ListShiftSchedulesQuery = z.infer<typeof listShiftSchedulesQuerySchema>;
export type ListMyShiftSchedulesQuery = z.infer<typeof listMyShiftSchedulesQuerySchema>;
export type CreateShiftScheduleInput = z.infer<typeof createShiftScheduleSchema>;
export type UpdateShiftScheduleInput = z.infer<typeof updateShiftScheduleSchema>;
