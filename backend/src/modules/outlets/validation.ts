import { z } from "zod";

export const createOutletSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  receiptLogoUrl: z.string().url().optional(),
  receiptFooter: z.string().optional(),
  serviceChargeEnabled: z.boolean().optional(),
  serviceChargeRate: z.number().min(0).max(100).optional(),
  einvoiceTin: z.string().trim().min(1).optional(),
  einvoiceBrn: z.string().trim().min(1).optional(),
  einvoiceMsicCode: z.string().trim().regex(/^\d{5}$/, "MSIC code must be 5 digits").optional(),
  einvoiceSstNo: z.string().trim().min(1).optional(),
});

export const updateOutletSchema = createOutletSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateOutletInput = z.infer<typeof createOutletSchema>;
export type UpdateOutletInput = z.infer<typeof updateOutletSchema>;
