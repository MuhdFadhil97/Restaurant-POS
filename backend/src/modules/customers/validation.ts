import { z } from "zod";

const optionalDate = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.date().optional()
);

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  identificationNo: z.string().optional(),
  dateOfBirth: optionalDate,
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  source: z.enum(["WALK_IN", "SOCIAL_MEDIA", "REFERRAL", "THIRD_PARTY", "ONLINE"]).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
