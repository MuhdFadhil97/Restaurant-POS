import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER"]),
  outletIds: z.array(z.coerce.number().int()).default([]),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER"]).optional(),
  isActive: z.boolean().optional(),
  outletIds: z.array(z.coerce.number().int()).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
