import { z } from "zod";

export const reportQuerySchema = z.object({
  outletId: z.string().uuid(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
