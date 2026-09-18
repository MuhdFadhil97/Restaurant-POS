import { z } from "zod";

export const createOutletSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  receiptLogoUrl: z.string().url().optional(),
  receiptFooter: z.string().optional(),
});

export const updateOutletSchema = createOutletSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateOutletInput = z.infer<typeof createOutletSchema>;
export type UpdateOutletInput = z.infer<typeof updateOutletSchema>;
