import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1),
  accountingCategory: z.string().trim().min(1).nullish(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
