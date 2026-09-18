import { z } from "zod";

export const reportQuerySchema = z.object({
  outletId: z.coerce.number().int(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;

// For reports with no time dimension (current stock levels only).
export const outletOnlyQuerySchema = z.object({
  outletId: z.coerce.number().int(),
  categoryId: z.coerce.number().int().optional(),
});
export type OutletOnlyQuery = z.infer<typeof outletOnlyQuerySchema>;

export const movementQuerySchema = reportQuerySchema.extend({
  type: z.enum(["RESTOCK", "WASTAGE", "CORRECTION", "SALE", "REFUND", "TRANSFER_OUT", "TRANSFER_IN"]).optional(),
  productId: z.coerce.number().int().optional(),
});
export type MovementQuery = z.infer<typeof movementQuerySchema>;

export const auditLogQuerySchema = z.object({
  outletId: z.coerce.number().int().optional(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  userId: z.coerce.number().int().optional(),
});
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export const stockTransferQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  outletId: z.coerce.number().int().optional(), // matches transfers where this outlet is either side
  fromOutletId: z.coerce.number().int().optional(),
  toOutletId: z.coerce.number().int().optional(),
});
export type StockTransferQuery = z.infer<typeof stockTransferQuerySchema>;

export const exportFormatSchema = z.object({
  format: z.enum(["xlsx", "pdf"]),
});

export const salesByCategoryQuerySchema = reportQuerySchema.extend({
  categoryId: z.coerce.number().int().optional(),
});
export type SalesByCategoryQuery = z.infer<typeof salesByCategoryQuerySchema>;

export const voidsRefundsQuerySchema = reportQuerySchema.extend({
  cashierId: z.coerce.number().int().optional(),
});
export type VoidsRefundsQuery = z.infer<typeof voidsRefundsQuerySchema>;

export const discountUsageQuerySchema = reportQuerySchema;
export type DiscountUsageQuery = z.infer<typeof discountUsageQuerySchema>;

export const taxCollectedQuerySchema = reportQuerySchema;
export type TaxCollectedQuery = z.infer<typeof taxCollectedQuerySchema>;

export const einvoiceStatusQuerySchema = reportQuerySchema.extend({
  einvoiceStatus: z.enum(["NOT_APPLICABLE", "GENERATED", "CANCELLED"]).optional(),
});
export type EinvoiceStatusQuery = z.infer<typeof einvoiceStatusQuerySchema>;
