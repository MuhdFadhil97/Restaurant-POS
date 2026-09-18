import { z } from "zod";

const variantInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  value: z.string().min(1),
  skuSuffix: z.string().optional(),
  priceAdjustment: z.number().default(0),
});

export const createProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  unitPrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative(),
  taxRateId: z.string().uuid().optional(),
  stationId: z.string().uuid().optional(),
  unitOfMeasure: z.string().min(1),
  imageUrl: z.string().url().optional(),
  lowStockThreshold: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  variants: z.array(variantInput).default([]),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

const optionalCell = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const numberCell = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v);
const boolCell = (v: unknown) => {
  if (typeof v !== "string") return v;
  const s = v.trim().toLowerCase();
  if (s === "") return undefined;
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return v;
};

export const importProductRowSchema = z.object({
  sku: z.string().min(1, "sku is required"),
  name: z.string().min(1, "name is required"),
  category: z.preprocess(optionalCell, z.string().optional()),
  unitPrice: z.preprocess(numberCell, z.number({ invalid_type_error: "unitPrice must be a number" }).nonnegative()),
  costPrice: z.preprocess(numberCell, z.number({ invalid_type_error: "costPrice must be a number" }).nonnegative()),
  unitOfMeasure: z.string().min(1, "unitOfMeasure is required"),
  taxRate: z.preprocess(optionalCell, z.string().optional()),
  station: z.preprocess(optionalCell, z.string().optional()),
  lowStockThreshold: z.preprocess(
    numberCell,
    z.number({ invalid_type_error: "lowStockThreshold must be a number" }).int().nonnegative()
  ).default(0),
  isActive: z.preprocess(boolCell, z.boolean()).default(true),
  imageUrl: z.preprocess(optionalCell, z.string().url("imageUrl must be a valid URL").optional()),
});

export const importProductsBodySchema = z.object({
  csv: z.string().min(1, "csv content is required"),
});

export type ImportProductRow = z.infer<typeof importProductRowSchema>;

// Combines optionalCell's blank-means-absent with numberCell's string-to-number coercion,
// so a blank cell means "leave this field unchanged" rather than "invalid number".
const optionalNumberCell = (v: unknown) => {
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  return trimmed === "" ? undefined : Number(trimmed);
};

export const bulkAdjustProductRowSchema = z
  .object({
    sku: z.string().min(1, "sku is required"),
    newUnitPrice: z.preprocess(
      optionalNumberCell,
      z.number({ invalid_type_error: "newUnitPrice must be a number" }).nonnegative().optional()
    ),
    newCostPrice: z.preprocess(
      optionalNumberCell,
      z.number({ invalid_type_error: "newCostPrice must be a number" }).nonnegative().optional()
    ),
    lowStockThreshold: z.preprocess(
      optionalNumberCell,
      z.number({ invalid_type_error: "lowStockThreshold must be a number" }).int().nonnegative().optional()
    ),
    stockAdjustmentType: z.preprocess(optionalCell, z.enum(["RESTOCK", "WASTAGE", "CORRECTION"]).optional()),
    // Always entered as a positive quantity; stockAdjustmentType decides the direction
    // (mirrors the single-product Adjust Stock modal, which takes the same shape).
    stockQuantityChange: z.preprocess(
      optionalNumberCell,
      z.number({ invalid_type_error: "stockQuantityChange must be a number" }).int().positive().optional()
    ),
    reason: z.preprocess(optionalCell, z.string().optional()),
  })
  .refine(
    (v) =>
      v.newUnitPrice !== undefined ||
      v.newCostPrice !== undefined ||
      v.lowStockThreshold !== undefined ||
      v.stockQuantityChange !== undefined,
    { message: "Row has no changes — set at least one of newUnitPrice, newCostPrice, lowStockThreshold, stockQuantityChange" }
  )
  .refine((v) => v.stockQuantityChange === undefined || v.stockAdjustmentType !== undefined, {
    message: "stockAdjustmentType is required when stockQuantityChange is set",
    path: ["stockAdjustmentType"],
  })
  .refine((v) => v.stockAdjustmentType === undefined || v.stockQuantityChange !== undefined, {
    message: "stockQuantityChange is required when stockAdjustmentType is set",
    path: ["stockQuantityChange"],
  });

export const bulkAdjustProductsBodySchema = z.object({
  csv: z.string().min(1, "csv content is required"),
});

export type BulkAdjustProductRow = z.infer<typeof bulkAdjustProductRowSchema>;
