import { z } from "zod";

const tableShape = z.enum(["ROUND", "RECTANGLE"]);

export const createTableSchema = z.object({
  outletId: z.string().uuid(),
  name: z.string().min(1),
  capacity: z.number().int().positive().default(2),
});

export const updateTableSchema = z.object({
  name: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "NOT_AVAILABLE"]).optional(),
  reservedFor: z.string().min(1).nullable().optional(),
  reservedAt: z.coerce.date().nullable().optional(),
  reservedPartySize: z.number().int().positive().nullable().optional(),
});

export const saveLayoutSchema = z.object({
  outletId: z.string().uuid(),
  tables: z
    .array(
      z.object({
        id: z.string().uuid(),
        posX: z.number().int(),
        posY: z.number().int(),
        shape: tableShape.optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      })
    )
    .min(1),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type SaveLayoutInput = z.infer<typeof saveLayoutSchema>;
