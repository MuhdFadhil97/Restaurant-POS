import { z } from "zod";

export const reprintReceiptSchema = z.object({
  transactionId: z.coerce.number().int(),
  terminalId: z.coerce.number().int(),
});
