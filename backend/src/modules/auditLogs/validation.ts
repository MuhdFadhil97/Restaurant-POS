import { z } from "zod";

export const auditLogQuerySchema = z.object({
  outletId: z.coerce.number().int().optional(),
  userId: z.coerce.number().int().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
