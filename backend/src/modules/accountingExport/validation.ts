import { z } from "zod";

export const createRunSchema = z.object({
  outletId: z.coerce.number().int(),
  format: z.enum(["QUICKBOOKS_CSV", "XERO_CSV", "GENERIC_CSV"]),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});
export type CreateRunInput = z.infer<typeof createRunSchema>;

export const listRunsQuerySchema = z.object({
  outletId: z.coerce.number().int(),
});
export type ListRunsQuery = z.infer<typeof listRunsQuerySchema>;
