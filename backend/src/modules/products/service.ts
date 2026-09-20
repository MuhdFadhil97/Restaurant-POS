import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { CreateProductInput, UpdateProductInput, importProductRowSchema, bulkAdjustProductRowSchema } from "./validation";

const baseInclude = {
  category: true,
  taxRate: true,
  station: true,
  variants: { where: { deletedAt: null } },
};

// Cashiers must never see cost price (used for margin/reporting only).
function stripCostPrice<T extends { costPrice: unknown }>(product: T, canSeeCost: boolean) {
  if (canSeeCost) return product;
  const { costPrice, ...rest } = product;
  return rest;
}

export async function listProducts(outletId: number | undefined, canSeeCost: boolean) {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      ...baseInclude,
      stocks: outletId ? { where: { outletId } } : false,
    },
    orderBy: { name: "asc" },
  });
  return products.map((p) => stripCostPrice(p, canSeeCost));
}

export async function getProduct(id: number, outletId: number | undefined, canSeeCost: boolean) {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...baseInclude,
      stocks: outletId ? { where: { outletId } } : false,
    },
  });
  if (!product) throw ApiError.notFound("Product not found");
  return stripCostPrice(product, canSeeCost);
}

export async function createProduct(input: CreateProductInput) {
  const { variants, ...productData } = input;
  return prisma.product.create({
    data: {
      ...productData,
      variants: { create: variants },
    },
    include: baseInclude,
  });
}

export async function updateProduct(id: number, input: UpdateProductInput) {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Product not found");

  const { variants, ...productData } = input;

  return prisma.$transaction(async (tx) => {
    if (variants) {
      const incomingIds = variants.filter((v) => v.id).map((v) => v.id!);
      await tx.productVariant.deleteMany({
        where: incomingIds.length > 0 ? { productId: id, id: { notIn: incomingIds } } : { productId: id },
      });
      for (const v of variants) {
        if (v.id) {
          await tx.productVariant.update({ where: { id: v.id }, data: v });
        } else {
          await tx.productVariant.create({ data: { ...v, productId: id } });
        }
      }
    }

    return tx.product.update({
      where: { id },
      data: productData,
      include: baseInclude,
    });
  });
}

export interface ImportRowError {
  row: number;
  sku?: string;
  message: string;
}

export interface ImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  errors: ImportRowError[];
}

export type ImportRowAction = "create" | "update" | "restore" | "invalid";

export interface ImportPreviewRow {
  row: number;
  sku?: string;
  name?: string;
  action: ImportRowAction;
  note?: string;
  error?: string;
  data: Record<string, string>;
}

export interface ImportPreview {
  totalRows: number;
  toCreate: number;
  toUpdate: number;
  toRestore: number;
  invalid: number;
  rows: ImportPreviewRow[];
}

interface ImportCaches {
  category: Map<string, number>;
  taxRate: Map<string, number>;
  station: Map<string, number>;
}

function newImportCaches(): ImportCaches {
  return { category: new Map(), taxRate: new Map(), station: new Map() };
}

async function resolveCategoryId(
  name: string,
  cache: Map<string, number>,
  createIfMissing: boolean
): Promise<{ id?: number; willCreate: boolean }> {
  const key = name.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached) return { id: cached, willCreate: false };
  const existing = await prisma.productCategory.findFirst({
    where: { deletedAt: null, name: { equals: name.trim(), mode: "insensitive" } },
  });
  if (existing) {
    cache.set(key, existing.id);
    return { id: existing.id, willCreate: false };
  }
  if (createIfMissing) {
    const created = await prisma.productCategory.create({ data: { name: name.trim() } });
    cache.set(key, created.id);
    return { id: created.id, willCreate: false };
  }
  return { id: undefined, willCreate: true };
}

async function resolveTaxRateId(name: string, outletId: number | undefined, cache: Map<string, number>): Promise<number> {
  if (!outletId) throw new Error("outletId is required to resolve a tax rate by name");
  const key = `${outletId}:${name.trim().toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const taxRate = await prisma.taxRate.findFirst({
    where: { outletId, name: { equals: name.trim(), mode: "insensitive" } },
  });
  if (!taxRate) throw new Error(`Tax rate "${name}" not found for the selected outlet`);
  cache.set(key, taxRate.id);
  return taxRate.id;
}

async function resolveStationId(name: string, outletId: number | undefined, cache: Map<string, number>): Promise<number> {
  if (!outletId) throw new Error("outletId is required to resolve a kitchen station by name");
  const key = `${outletId}:${name.trim().toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const station = await prisma.kitchenStation.findFirst({
    where: { outletId, deletedAt: null, name: { equals: name.trim(), mode: "insensitive" } },
  });
  if (!station) throw new Error(`Kitchen station "${name}" not found for the selected outlet`);
  cache.set(key, station.id);
  return station.id;
}

async function resolveImportRow(
  data: z.infer<typeof importProductRowSchema>,
  outletId: number | undefined,
  caches: ImportCaches,
  createCategory: boolean
) {
  const category = data.category
    ? await resolveCategoryId(data.category, caches.category, createCategory)
    : { id: undefined, willCreate: false };
  const taxRateId = data.taxRate ? await resolveTaxRateId(data.taxRate, outletId, caches.taxRate) : undefined;
  const stationId = data.station ? await resolveStationId(data.station, outletId, caches.station) : undefined;

  const productData = {
    sku: data.sku,
    name: data.name,
    categoryId: category.id,
    unitPrice: data.unitPrice,
    costPrice: data.costPrice,
    unitOfMeasure: data.unitOfMeasure,
    taxRateId,
    stationId,
    lowStockThreshold: data.lowStockThreshold,
    isActive: data.isActive,
    imageUrl: data.imageUrl,
  };

  // sku has a global unique constraint, so a previously soft-deleted product still
  // occupies its sku — matching on sku alone (regardless of deletedAt) lets us detect
  // that and restore it instead of trying (and failing) to create anew.
  const existing = await prisma.product.findFirst({
    where: { sku: data.sku },
    select: { id: true, deletedAt: true },
  });

  return { productData, categoryWillCreate: category.willCreate, existing };
}

// Validates and resolves every row against the current database state (by SKU) without
// writing anything, so the caller can show the user what will happen before they commit.
export async function previewImportProducts(
  rawRows: Record<string, string>[],
  outletId?: number
): Promise<ImportPreview> {
  const preview: ImportPreview = { totalRows: rawRows.length, toCreate: 0, toUpdate: 0, toRestore: 0, invalid: 0, rows: [] };
  const caches = newImportCaches();

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2; // +1 for 0-index, +1 for header row
    const raw = rawRows[i];
    const parsed = importProductRowSchema.safeParse(raw);
    if (!parsed.success) {
      preview.invalid++;
      preview.rows.push({
        row: rowNumber,
        sku: raw.sku,
        name: raw.name,
        action: "invalid",
        error: parsed.error.issues.map((e) => e.message).join("; "),
        data: raw,
      });
      continue;
    }

    const data = parsed.data;
    try {
      const resolved = await resolveImportRow(data, outletId, caches, false);
      let action: ImportRowAction;
      if (!resolved.existing) action = "create";
      else if (resolved.existing.deletedAt) action = "restore";
      else action = "update";

      if (action === "create") preview.toCreate++;
      else if (action === "update") preview.toUpdate++;
      else preview.toRestore++;

      preview.rows.push({
        row: rowNumber,
        sku: data.sku,
        name: data.name,
        action,
        note: resolved.categoryWillCreate ? `New category "${data.category}" will be created` : undefined,
        data: raw,
      });
    } catch (err) {
      preview.invalid++;
      preview.rows.push({
        row: rowNumber,
        sku: data.sku,
        name: data.name,
        action: "invalid",
        error: err instanceof Error ? err.message : "Unknown error",
        data: raw,
      });
    }
  }

  return preview;
}

export async function importProducts(rawRows: Record<string, string>[], outletId?: number): Promise<ImportSummary> {
  const summary: ImportSummary = { totalRows: rawRows.length, created: 0, updated: 0, failed: 0, errors: [] };
  const caches = newImportCaches();

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2; // +1 for 0-index, +1 for header row
    const raw = rawRows[i];
    const parsed = importProductRowSchema.safeParse(raw);
    if (!parsed.success) {
      summary.failed++;
      summary.errors.push({
        row: rowNumber,
        sku: raw.sku,
        message: parsed.error.issues.map((e) => e.message).join("; "),
      });
      continue;
    }

    const data = parsed.data;
    try {
      const resolved = await resolveImportRow(data, outletId, caches, true);
      if (resolved.existing) {
        await prisma.product.update({
          where: { id: resolved.existing.id },
          data: { ...resolved.productData, deletedAt: null },
        });
        summary.updated++;
      } else {
        await prisma.product.create({ data: resolved.productData });
        summary.created++;
      }
    } catch (err) {
      summary.failed++;
      summary.errors.push({
        row: rowNumber,
        sku: data.sku,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return summary;
}

export interface BulkAdjustRowError {
  row: number;
  sku?: string;
  message: string;
}

export interface BulkAdjustSummary {
  totalRows: number;
  adjusted: number;
  failed: number;
  errors: BulkAdjustRowError[];
}

export type BulkAdjustRowAction = "adjust" | "invalid";

export interface BulkAdjustPreviewRow {
  row: number;
  sku?: string;
  name?: string;
  action: BulkAdjustRowAction;
  note?: string;
  error?: string;
}

export interface BulkAdjustPreview {
  totalRows: number;
  toAdjust: number;
  invalid: number;
  rows: BulkAdjustPreviewRow[];
}

function describeBulkAdjustRow(data: z.infer<typeof bulkAdjustProductRowSchema>): string {
  const changes: string[] = [];
  if (data.newUnitPrice !== undefined) changes.push(`unit price → ${data.newUnitPrice}`);
  if (data.newCostPrice !== undefined) changes.push(`cost price → ${data.newCostPrice}`);
  if (data.lowStockThreshold !== undefined) changes.push(`low stock threshold → ${data.lowStockThreshold}`);
  if (data.stockQuantityChange !== undefined) {
    const signed = data.stockAdjustmentType === "RESTOCK" ? data.stockQuantityChange : -data.stockQuantityChange;
    changes.push(`stock ${signed > 0 ? "+" : ""}${signed} (${data.stockAdjustmentType})`);
  }
  return changes.join(", ");
}

// Bulk Adjustment only ever touches existing products — unlike importProducts, a missing
// SKU here is an error, never a row to create.
export async function previewBulkAdjustProducts(
  rawRows: Record<string, string>[],
  outletId?: number
): Promise<BulkAdjustPreview> {
  const preview: BulkAdjustPreview = { totalRows: rawRows.length, toAdjust: 0, invalid: 0, rows: [] };

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2; // +1 for 0-index, +1 for header row
    const raw = rawRows[i];
    const parsed = bulkAdjustProductRowSchema.safeParse(raw);
    if (!parsed.success) {
      preview.invalid++;
      preview.rows.push({
        row: rowNumber,
        sku: raw.sku,
        action: "invalid",
        error: parsed.error.issues.map((e) => e.message).join("; "),
      });
      continue;
    }

    const data = parsed.data;
    const product = await prisma.product.findFirst({ where: { sku: data.sku, deletedAt: null } });
    if (!product) {
      preview.invalid++;
      preview.rows.push({ row: rowNumber, sku: data.sku, action: "invalid", error: `Product with SKU "${data.sku}" not found` });
      continue;
    }
    if (data.stockQuantityChange !== undefined && !outletId) {
      preview.invalid++;
      preview.rows.push({
        row: rowNumber,
        sku: data.sku,
        name: product.name,
        action: "invalid",
        error: "An outlet must be selected to adjust stock",
      });
      continue;
    }

    preview.toAdjust++;
    preview.rows.push({ row: rowNumber, sku: data.sku, name: product.name, action: "adjust", note: describeBulkAdjustRow(data) });
  }

  return preview;
}

export async function bulkAdjustProducts(
  rawRows: Record<string, string>[],
  outletId: number | undefined,
  userId: number
): Promise<BulkAdjustSummary> {
  const summary: BulkAdjustSummary = { totalRows: rawRows.length, adjusted: 0, failed: 0, errors: [] };

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2; // +1 for 0-index, +1 for header row
    const raw = rawRows[i];
    const parsed = bulkAdjustProductRowSchema.safeParse(raw);
    if (!parsed.success) {
      summary.failed++;
      summary.errors.push({ row: rowNumber, sku: raw.sku, message: parsed.error.issues.map((e) => e.message).join("; ") });
      continue;
    }

    const data = parsed.data;
    try {
      const product = await prisma.product.findFirst({ where: { sku: data.sku, deletedAt: null } });
      if (!product) throw new Error(`Product with SKU "${data.sku}" not found`);
      if (data.stockQuantityChange !== undefined && !outletId) {
        throw new Error("An outlet must be selected to adjust stock");
      }

      await prisma.$transaction(async (tx) => {
        const productUpdate: Record<string, number> = {};
        if (data.newUnitPrice !== undefined) productUpdate.unitPrice = data.newUnitPrice;
        if (data.newCostPrice !== undefined) productUpdate.costPrice = data.newCostPrice;
        if (data.lowStockThreshold !== undefined) productUpdate.lowStockThreshold = data.lowStockThreshold;

        if (Object.keys(productUpdate).length > 0) {
          await tx.product.update({ where: { id: product.id }, data: productUpdate });
          await recordAudit(tx, {
            userId,
            action: "PRODUCT_BULK_ADJUSTMENT",
            entityType: "Product",
            entityId: product.id,
            outletId,
            details: productUpdate,
          });
        }

        if (data.stockQuantityChange !== undefined && outletId) {
          const signedQty = data.stockAdjustmentType === "RESTOCK" ? data.stockQuantityChange : -data.stockQuantityChange;
          const existingStock = await tx.productStock.findFirst({
            where: { productId: product.id, variantId: null, outletId },
          });
          if (existingStock) {
            await tx.productStock.update({ where: { id: existingStock.id }, data: { quantity: { increment: signedQty } } });
          } else {
            await tx.productStock.create({
              data: { productId: product.id, variantId: null, outletId, quantity: Math.max(signedQty, 0) },
            });
          }
          await tx.inventoryMovement.create({
            data: {
              outletId,
              productId: product.id,
              type: data.stockAdjustmentType!,
              quantityChange: signedQty,
              reason: data.reason,
              performedByUserId: userId,
            },
          });
          await recordAudit(tx, {
            userId,
            action: "STOCK_ADJUSTMENT",
            entityType: "Product",
            entityId: product.id,
            outletId,
            details: { type: data.stockAdjustmentType, quantityChange: signedQty, reason: data.reason, source: "bulk-adjustment-import" },
          });
        }
      });

      summary.adjusted++;
    } catch (err) {
      summary.failed++;
      summary.errors.push({ row: rowNumber, sku: data.sku, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return summary;
}

export async function deleteProduct(id: number) {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Product not found");
  await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}
