import { z } from "zod";

const itemInput = z.object({
  productId: z.coerce.number().int(),
  variantId: z.coerce.number().int().optional(),
  quantity: z.number().int().positive(),
});

export const createTransferSchema = z
  .object({
    fromOutletId: z.coerce.number().int(),
    toOutletId: z.coerce.number().int(),
    notes: z.string().optional(),
    items: z.array(itemInput).min(1, "At least one item is required"),
  })
  .refine((v) => v.fromOutletId !== v.toOutletId, {
    message: "fromOutletId and toOutletId must differ",
    path: ["toOutletId"],
  });

export const listQuerySchema = z.object({
  outletId: z.coerce.number().int().optional(),
  status: z.enum(["PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"]).optional(),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
