import { z } from "zod";

export const createDiscountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  scope: z.enum(["LINE", "ORDER"]),
  value: z.number().nonnegative(),
  code: z.string().optional(),
  isActive: z.boolean().default(true),
  // Promotion eligibility rules — all optional, null/absent means unconstrained.
  minSpend: z.number().nonnegative().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  usageLimit: z.number().int().positive().optional(),
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

export const updateDiscountSchema = createDiscountSchema.partial();

export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;
