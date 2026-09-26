import { z } from "zod";
import { MODULE_KEYS } from "../../lib/modules";

const moduleKeySchema = z.enum(MODULE_KEYS);

export const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  // Omit to invite the user instead: they're emailed a link to set their
  // own password rather than the admin choosing one for them.
  password: z.string().min(8).optional(),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER"]),
  outletIds: z.array(z.coerce.number().int()).default([]),
  moduleAccess: z.array(moduleKeySchema).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER"]).optional(),
  isActive: z.boolean().optional(),
  outletIds: z.array(z.coerce.number().int()).optional(),
  moduleAccess: z.array(moduleKeySchema).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
