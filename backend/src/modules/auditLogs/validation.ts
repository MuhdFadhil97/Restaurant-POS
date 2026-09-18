import { z } from "zod";

export const auditLogQuerySchema = z.object({
  outletId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
