import { z } from "zod";

export const tokenParamsSchema = z.object({
  token: z.string().min(16).max(64),
});

export const submitOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int(),
        variantId: z.coerce.number().int().optional(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export type TokenParams = z.infer<typeof tokenParamsSchema>;
export type SubmitOrderInput = z.infer<typeof submitOrderSchema>;
