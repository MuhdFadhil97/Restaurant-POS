import { z } from "zod";

export const openSessionSchema = z.object({
  outletId: z.coerce.number().int(),
  openingCash: z.number().nonnegative(),
  terminalId: z.coerce.number().int().optional(),
});

export const closeSessionSchema = z.object({
  actualCash: z.number().nonnegative(),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
