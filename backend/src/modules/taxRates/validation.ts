import { z } from "zod";

export const createTaxRateSchema = z.object({
  outletId: z.coerce.number().int(),
  name: z.string().min(1),
  rate: z.number().min(0).max(100),
  isDefault: z.boolean().default(false),
});

export const updateTaxRateSchema = createTaxRateSchema.partial().omit({ outletId: true });

export type CreateTaxRateInput = z.infer<typeof createTaxRateSchema>;
export type UpdateTaxRateInput = z.infer<typeof updateTaxRateSchema>;
