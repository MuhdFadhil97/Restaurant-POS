import { z } from "zod";

export const platformIdParamsSchema = z.object({
  platformId: z.coerce.number().int(),
});

export const listOrdersQuerySchema = z.object({
  outletId: z.coerce.number().int(),
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "READY", "PICKED_UP", "CANCELLED"]).optional(),
});

export const rejectOrderSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const updateStatusSchema = z.object({
  status: z.enum(["READY", "PICKED_UP"]),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
