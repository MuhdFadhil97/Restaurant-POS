import { z } from "zod";

export const createStationSchema = z.object({
  outletId: z.coerce.number().int(),
  name: z.string().min(1),
  printerId: z.coerce.number().int().nullable().optional(),
});

export const updateStationSchema = z.object({
  name: z.string().min(1).optional(),
  printerId: z.coerce.number().int().nullable().optional(),
});

export type CreateStationInput = z.infer<typeof createStationSchema>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;
