import { z } from "zod";

const itemInput = z.object({
  productId: z.coerce.number().int(),
  variantId: z.coerce.number().int().optional(),
  quantity: z.number().int().positive(),
  discountId: z.coerce.number().int().optional(),
});

const paymentInput = z.object({
  method: z.enum(["CASH", "CARD", "EWALLET", "GIFT_CARD", "LOYALTY_POINTS"]),
  amount: z.number().positive(),
  // For GIFT_CARD payments, this carries the gift card's code.
  reference: z.string().optional(),
  remark: z.string().optional(),
});

export const createDraftSchema = z.object({
  outletId: z.coerce.number().int(),
  tableId: z.coerce.number().int().optional(),
  customerId: z.coerce.number().int().optional(),
  orderDiscountId: z.coerce.number().int().optional(),
  notes: z.string().optional(),
  items: z.array(itemInput).default([]),
});

export const checkoutSchema = createDraftSchema.extend({
  payments: z.array(paymentInput).min(1, "At least one payment is required"),
});

export const finalizeSchema = z.object({
  payments: z.array(paymentInput).min(1, "At least one payment is required"),
});

export const addItemSchema = itemInput;

export const updateItemSchema = z.object({
  quantity: z.number().int().positive().optional(),
  discountId: z.coerce.number().int().nullable().optional(),
});

export const updateTransactionSchema = z.object({
  customerId: z.coerce.number().int().nullable().optional(),
  tableId: z.coerce.number().int().nullable().optional(),
  orderDiscountId: z.coerce.number().int().nullable().optional(),
  notes: z.string().optional(),
});

export const voidSchema = z.object({
  reason: z.string().min(1),
  approverId: z.coerce.number().int().optional(),
  approverPassword: z.string().optional(),
});

export const refundSchema = voidSchema;

export const listQuerySchema = z.object({
  outletId: z.coerce.number().int().optional(),
  cashierId: z.coerce.number().int().optional(),
  status: z.enum(["HELD", "OPEN", "COMPLETED", "VOIDED", "REFUNDED"]).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "EWALLET", "GIFT_CARD", "LOYALTY_POINTS"]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type FinalizeInput = z.infer<typeof finalizeSchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type VoidInput = z.infer<typeof voidSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
