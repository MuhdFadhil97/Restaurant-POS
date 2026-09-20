import { z } from "zod";

export const createSupplierProductSchema = z.object({
  supplierId: z.coerce.number().int(),
  productId: z.coerce.number().int(),
  variantId: z.coerce.number().int().optional(),
  supplierSku: z.string().optional(),
  unitCost: z.number().nonnegative(),
  leadTimeDays: z.number().int().nonnegative().optional(),
  isPreferred: z.boolean().default(false),
});

export const updateSupplierProductSchema = createSupplierProductSchema
  .partial()
  .omit({ supplierId: true, productId: true, variantId: true });

export type CreateSupplierProductInput = z.infer<typeof createSupplierProductSchema>;
export type UpdateSupplierProductInput = z.infer<typeof updateSupplierProductSchema>;
