import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxRegistrationNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
