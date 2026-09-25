import { z } from "zod";

export const createPlatformSchema = z.object({
  outletId: z.coerce.number().int(),
  provider: z.enum(["GRAB", "FOODPANDA", "DOORDASH", "CUSTOM"]),
  name: z.string().min(1).max(120),
  apiKey: z.string().max(500).optional(),
  webhookSecret: z.string().min(8).max(500).optional(),
  autoAccept: z.boolean().optional(),
});

export const updatePlatformSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  apiKey: z.string().max(500).nullable().optional(),
  webhookSecret: z.string().min(8).max(500).nullable().optional(),
  autoAccept: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreatePlatformInput = z.infer<typeof createPlatformSchema>;
export type UpdatePlatformInput = z.infer<typeof updatePlatformSchema>;
