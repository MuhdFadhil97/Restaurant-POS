import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
  outletId: z.coerce.number().int(),
});
export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
