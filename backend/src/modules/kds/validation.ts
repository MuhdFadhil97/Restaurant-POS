import { z } from "zod";

export const queueQuerySchema = z.object({
  outletId: z.string().uuid(),
  stationId: z.string().uuid().optional(),
});

export const updatePrepStatusSchema = z.object({
  prepStatus: z.enum(["QUEUED", "PREPARING", "READY", "SERVED"]),
});

export type QueueQuery = z.infer<typeof queueQuerySchema>;
export type UpdatePrepStatusInput = z.infer<typeof updatePrepStatusSchema>;
