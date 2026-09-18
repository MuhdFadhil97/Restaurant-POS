import { z } from "zod";

export const createGiftCardSchema = z.object({
  code: z.string().min(4).optional(),
  balance: z.number().positive(),
  expiresAt: z.string().datetime().optional(),
});

export const adjustGiftCardSchema = z.object({
  isActive: z.boolean().optional(),
  balance: z.number().nonnegative().optional(),
});

export type CreateGiftCardInput = z.infer<typeof createGiftCardSchema>;
export type AdjustGiftCardInput = z.infer<typeof adjustGiftCardSchema>;
