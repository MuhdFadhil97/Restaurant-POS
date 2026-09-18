import { z } from "zod";
import { TIME_FORMAT_REGEX } from "../staffAttendance/complianceRules";

export const createShiftTemplateSchema = z.object({
  outletId: z.string().uuid(),
  name: z.string().min(1),
  startTime: z.string().regex(TIME_FORMAT_REGEX, "startTime must be HH:mm (24h)"),
  endTime: z.string().regex(TIME_FORMAT_REGEX, "endTime must be HH:mm (24h)"),
  breakMinutes: z.number().int().min(0).default(30),
});

export const updateShiftTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  startTime: z.string().regex(TIME_FORMAT_REGEX, "startTime must be HH:mm (24h)").optional(),
  endTime: z.string().regex(TIME_FORMAT_REGEX, "endTime must be HH:mm (24h)").optional(),
  breakMinutes: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const listShiftTemplatesQuerySchema = z.object({
  outletId: z.string().uuid(),
});

export type CreateShiftTemplateInput = z.infer<typeof createShiftTemplateSchema>;
export type UpdateShiftTemplateInput = z.infer<typeof updateShiftTemplateSchema>;
export type ListShiftTemplatesQuery = z.infer<typeof listShiftTemplatesQuerySchema>;
