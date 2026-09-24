import { z } from "zod";

const printerFields = z.object({
  outletId: z.coerce.number().int(),
  name: z.string().min(1),
  connection: z.enum(["NETWORK_DIRECT", "NETWORK_BRIDGE", "TERMINAL_LOCAL"]),
  host: z.string().trim().min(1).nullable().optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  bridgeId: z.coerce.number().int().nullable().optional(),
  terminalId: z.coerce.number().int().nullable().optional(),
  paperWidth: z.union([z.literal(58), z.literal(80)]).optional(),
  charsPerLine: z.coerce.number().int().min(24).max(64).optional(),
  isActive: z.boolean().optional(),
});

export const createPrinterSchema = printerFields;
export const updatePrinterSchema = printerFields.omit({ outletId: true }).partial();

export type CreatePrinterInput = z.infer<typeof createPrinterSchema>;
export type UpdatePrinterInput = z.infer<typeof updatePrinterSchema>;
