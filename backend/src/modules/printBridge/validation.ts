import { z } from "zod";

export const createBridgeSchema = z.object({
  outletId: z.coerce.number().int(),
  name: z.string().min(1),
});

export const updateBridgeSchema = z.object({
  name: z.string().min(1).optional(),
});

export const ackJobSchema = z.object({
  ok: z.boolean(),
  error: z.string().max(500).optional(),
});

export type CreateBridgeInput = z.infer<typeof createBridgeSchema>;
export type UpdateBridgeInput = z.infer<typeof updateBridgeSchema>;
export type AckJobInput = z.infer<typeof ackJobSchema>;
