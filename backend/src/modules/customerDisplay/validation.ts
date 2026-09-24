import { z } from "zod";

export const publishSnapshotSchema = z.object({
  status: z.enum(["CART", "PAID", "IDLE"]),
  lines: z
    .array(
      z.object({
        name: z.string(),
        variantLabel: z.string().optional(),
        quantity: z.number(),
        lineTotal: z.number(),
      })
    )
    .default([]),
  totals: z.object({
    subtotal: z.number(),
    discountTotal: z.number(),
    serviceChargeTotal: z.number(),
    taxTotal: z.number(),
    total: z.number(),
  }),
});

export type PublishSnapshotInput = z.infer<typeof publishSnapshotSchema>;
