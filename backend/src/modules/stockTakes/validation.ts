import { z } from "zod";

export const startStockTakeSchema = z.object({
  outletId: z.coerce.number().int(),
  notes: z.string().optional(),
});

export const saveCountsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.coerce.number().int(),
        countedQuantity: z.number().int().nonnegative(),
        notes: z.string().optional(),
      })
    )
    .min(1),
});

export const listQuerySchema = z.object({
  outletId: z.coerce.number().int().optional(),
});

export type StartStockTakeInput = z.infer<typeof startStockTakeSchema>;
export type SaveCountsInput = z.infer<typeof saveCountsSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
