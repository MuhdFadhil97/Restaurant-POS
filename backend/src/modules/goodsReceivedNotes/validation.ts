import { z } from "zod";

const receivedItem = z.object({
  purchaseOrderItemId: z.coerce.number().int(),
  quantityReceived: z.number().int().nonnegative(),
  quantityRejected: z.number().int().nonnegative().default(0),
  rejectionReason: z.string().optional(),
});

export const createGrnSchema = z.object({
  purchaseOrderId: z.coerce.number().int(),
  notes: z.string().optional(),
  items: z.array(receivedItem).min(1, "At least one item is required"),
});

export const listQuerySchema = z.object({
  outletId: z.coerce.number().int().optional(),
  purchaseOrderId: z.coerce.number().int().optional(),
});

export type CreateGrnInput = z.infer<typeof createGrnSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
