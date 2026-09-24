import { z } from "zod";

export const createTerminalSchema = z.object({
  outletId: z.coerce.number().int(),
  name: z.string().min(1),
  receiptPrinterId: z.coerce.number().int().nullable().optional(),
  cashDrawerEnabled: z.boolean().optional(),
  customerDisplayMode: z.enum(["NONE", "SAME_DEVICE", "REMOTE"]).optional(),
});

export const updateTerminalSchema = createTerminalSchema.omit({ outletId: true }).partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateTerminalInput = z.infer<typeof createTerminalSchema>;
export type UpdateTerminalInput = z.infer<typeof updateTerminalSchema>;
