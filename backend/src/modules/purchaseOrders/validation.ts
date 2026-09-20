import { z } from "zod";

const itemInput = z.object({
  productId: z.coerce.number().int(),
  variantId: z.coerce.number().int().optional(),
  quantityOrdered: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
  taxRateId: z.coerce.number().int().optional(),
  discountAmount: z.number().nonnegative().optional(),
});

export const createPurchaseOrderSchema = z.object({
  outletId: z.coerce.number().int(),
  supplierId: z.coerce.number().int(),
  expectedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(itemInput).min(1, "At least one item is required"),
});

export const updatePurchaseOrderSchema = z.object({
  supplierId: z.coerce.number().int().optional(),
  expectedAt: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
  items: z.array(itemInput).min(1, "At least one item is required").optional(),
});

export const listQuerySchema = z.object({
  outletId: z.coerce.number().int().optional(),
  status: z
    .enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"])
    .optional(),
});

export const rejectPurchaseOrderSchema = z.object({
  reason: z.string().min(1, "A rejection reason is required"),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type RejectPurchaseOrderInput = z.infer<typeof rejectPurchaseOrderSchema>;
