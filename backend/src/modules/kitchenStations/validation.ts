import { z } from "zod";

export const createStationSchema = z.object({
  outletId: z.coerce.number().int(),
  name: z.string().min(1),
});

export const updateStationSchema = z.object({
  name: z.string().min(1).optional(),
});

export type CreateStationInput = z.infer<typeof createStationSchema>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;
