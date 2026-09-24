import { z } from "zod";

export const sendToKitchenSchema = z.object({
  transactionId: z.coerce.number().int(),
});

export const reprintReceiptSchema = z.object({
  transactionId: z.coerce.number().int(),
  terminalId: z.coerce.number().int(),
});

export const ackTerminalJobSchema = z.object({
  ok: z.boolean(),
  error: z.string().max(500).optional(),
});

export type AckTerminalJobInput = z.infer<typeof ackTerminalJobSchema>;
