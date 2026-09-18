import { z } from "zod";

export const queueQuerySchema = z.object({
  outletId: z.coerce.number().int(),
  stationId: z.coerce.number().int().optional(),
});

export const updatePrepStatusSchema = z.object({
  prepStatus: z.enum(["QUEUED", "PREPARING", "READY", "SERVED"]),
});

export type QueueQuery = z.infer<typeof queueQuerySchema>;
export type UpdatePrepStatusInput = z.infer<typeof updatePrepStatusSchema>;
