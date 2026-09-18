import { prisma } from "../../lib/prisma";
import { buildMeta } from "../reports/export/reportMeta";
import { ReportData } from "../reports/types";
import { listLowStock, listMovements } from "./service";
import { MovementQuery, OutletOnlyQuery, ReportQuery } from "../reports/validation";

export async function stockOnHandReport(query: OutletOnlyQuery): Promise<ReportData> {
  const stocks = await prisma.productStock.findMany({
    where: {
      outletId: query.outletId,
      ...(query.categoryId ? { product: { categoryId: query.categoryId } } : {}),
    },
    include: { product: true, variant: true },
    orderBy: { product: { name: "asc" } },
  });

  const rows = stocks.map((s) => ({
    productName: s.variant ? `${s.product.name} (${s.variant.value})` : s.product.name,
    sku: s.product.sku,
    quantityOnHand: s.quantity,
    costPrice: Number(s.product.costPrice),
    valuation: s.quantity * Number(s.product.costPrice),
  }));

  return {
    title: "Stock on Hand / Valuation",
    columns: [
      { key: "productName", header: "Product" },
      { key: "sku", header: "SKU" },
      { key: "quantityOnHand", header: "Qty on Hand", format: "number" },
      { key: "costPrice", header: "Unit Cost", format: "currency" },
      { key: "valuation", header: "Valuation", format: "currency" },
    ],
    rows,
    totals: { valuation: rows.reduce((sum, r) => sum + r.valuation, 0) },
    meta: await buildMeta(query),
  };
}

export async function lowStockReport(query: OutletOnlyQuery): Promise<ReportData> {
  const stocks = await listLowStock(query.outletId);

  const rows = stocks
    .filter((s) => !query.categoryId || s.product.categoryId === query.categoryId)
    .map((s) => ({
      productName: s.variant ? `${s.product.name} (${s.variant.value})` : s.product.name,
      sku: s.product.sku,
      quantityOnHand: s.quantity,
      lowStockThreshold: s.product.lowStockThreshold,
      shortfall: s.product.lowStockThreshold - s.quantity,
    }));

  return {
    title: "Low Stock / Reorder Report",
    columns: [
      { key: "productName", header: "Product" },
      { key: "sku", header: "SKU" },
      { key: "quantityOnHand", header: "Qty on Hand", format: "number" },
      { key: "lowStockThreshold", header: "Reorder Threshold", format: "number" },
      { key: "shortfall", header: "Shortfall", format: "number" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

export async function movementsLedgerReport(query: MovementQuery): Promise<ReportData> {
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      outletId: query.outletId,
      createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
      ...(query.type ? { type: query.type } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
    },
    include: { product: true, variant: true, performedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  return {
    title: "Inventory Movements Ledger",
    columns: [
      { key: "createdAt", header: "Date", format: "datetime" },
      { key: "productName", header: "Product" },
      { key: "type", header: "Type" },
      { key: "quantityChange", header: "Qty Change", format: "number" },
      { key: "reason", header: "Reason" },
      { key: "performedByName", header: "Performed By" },
    ],
    rows: movements.map((m) => ({
      createdAt: m.createdAt.toISOString(),
      productName: m.variant ? `${m.product.name} (${m.variant.value})` : m.product.name,
      type: m.type,
      quantityChange: m.quantityChange,
      reason: m.reason ?? "",
      performedByName: m.performedBy.name,
    })),
    meta: await buildMeta(query),
  };
}

export async function wastageReport(query: ReportQuery): Promise<ReportData> {
  const movements = await listMovements(query.outletId);
  const wastage = movements.filter(
    (m) => m.type === "WASTAGE" && m.createdAt >= new Date(query.from) && m.createdAt <= new Date(query.to)
  );

  const rows = wastage.map((m) => ({
    createdAt: m.createdAt.toISOString(),
    productName: m.variant ? `${m.product.name} (${m.variant.value})` : m.product.name,
    quantityLost: Math.abs(m.quantityChange),
    costImpact: Math.abs(m.quantityChange) * Number(m.product.costPrice),
    reason: m.reason ?? "",
    performedByName: m.performedBy.name,
  }));

  return {
    title: "Wastage Report",
    columns: [
      { key: "createdAt", header: "Date", format: "datetime" },
      { key: "productName", header: "Product" },
      { key: "quantityLost", header: "Qty Lost", format: "number" },
      { key: "costImpact", header: "Cost Impact", format: "currency" },
      { key: "reason", header: "Reason" },
      { key: "performedByName", header: "Recorded By" },
    ],
    rows,
    totals: { costImpact: rows.reduce((sum, r) => sum + r.costImpact, 0) },
    meta: await buildMeta(query),
  };
}
