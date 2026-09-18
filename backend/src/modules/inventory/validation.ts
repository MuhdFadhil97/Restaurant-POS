import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  outletId: z.coerce.number().int(),
  productId: z.coerce.number().int(),
  variantId: z.coerce.number().int().optional(),
  type: z.enum(["RESTOCK", "WASTAGE", "CORRECTION"]),
  quantityChange: z.number().int().refine((v) => v !== 0, "quantityChange must not be 0"),
  reason: z.string().optional(),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
