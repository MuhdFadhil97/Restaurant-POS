import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  DiscountUsageQuery,
  EinvoiceStatusQuery,
  ReportQuery,
  SalesByCategoryQuery,
  TaxCollectedQuery,
  VoidsRefundsQuery,
} from "./validation";
import { AuditLogQuery } from "./validation";
import { buildMeta } from "./export/reportMeta";
import { ReportData } from "./types";

const COMPLETED_STATUSES = Prisma.sql`('COMPLETED', 'REFUNDED')`;

// ── Sales (existing raw queries, unchanged — reused by both the legacy JSON
// endpoints and the *Report() wrappers below) ──────────────────────────────

export async function salesSummary(query: ReportQuery) {
  const bucket = query.groupBy; // validated to day|week|month, safe to interpolate

  const rows = await prisma.$queryRaw<
    {
      bucket: Date;
      order_count: bigint;
      gross_sales: string;
      tax_total: string;
      discount_total: string;
      service_charge_total: string;
    }[]
  >(Prisma.sql`
    SELECT
      date_trunc(${bucket}, "created_at") AS bucket,
      COUNT(*)::bigint AS order_count,
      SUM("total")::text AS gross_sales,
      SUM("tax_total")::text AS tax_total,
      SUM("discount_total")::text AS discount_total,
      SUM("service_charge_total")::text AS service_charge_total
    FROM "transactions"
    WHERE "outlet_id" = ${query.outletId}
      AND "status" IN ${COMPLETED_STATUSES}
      AND "created_at" BETWEEN ${new Date(query.from)} AND ${new Date(query.to)}
    GROUP BY bucket
    ORDER BY bucket ASC
  `);

  return rows.map((r) => ({
    period: r.bucket,
    orderCount: Number(r.order_count),
    grossSales: Number(r.gross_sales ?? 0),
    taxTotal: Number(r.tax_total ?? 0),
    discountTotal: Number(r.discount_total ?? 0),
    serviceChargeTotal: Number(r.service_charge_total ?? 0),
  }));
}

export async function topProducts(query: ReportQuery) {
  const rows = await prisma.$queryRaw<
    { product_id: string; name: string; sku: string; quantity_sold: bigint; revenue: string }[]
  >(Prisma.sql`
    SELECT
      p."id" AS product_id,
      p."name" AS name,
      p."sku" AS sku,
      SUM(ti."quantity")::bigint AS quantity_sold,
      SUM(ti."line_total")::text AS revenue
    FROM "transaction_items" ti
    JOIN "transactions" t ON t."id" = ti."transaction_id"
    JOIN "products" p ON p."id" = ti."product_id"
    WHERE t."outlet_id" = ${query.outletId}
      AND t."status" = 'COMPLETED'
      AND t."created_at" BETWEEN ${new Date(query.from)} AND ${new Date(query.to)}
    GROUP BY p."id", p."name", p."sku"
    ORDER BY quantity_sold DESC
    LIMIT ${query.limit}
  `);

  return rows.map((r) => ({
    productId: r.product_id,
    name: r.name,
    sku: r.sku,
    quantitySold: Number(r.quantity_sold),
    revenue: Number(r.revenue ?? 0),
  }));
}

export async function salesByCashier(query: ReportQuery) {
  const rows = await prisma.transaction.groupBy({
    by: ["cashierId"],
    where: {
      outletId: query.outletId,
      status: "COMPLETED",
      createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
    },
    _sum: { total: true },
    _count: { _all: true },
  });

  const cashiers = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.cashierId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(cashiers.map((c) => [c.id, c.name]));

  return rows.map((r) => ({
    cashierId: r.cashierId,
    cashierName: nameById.get(r.cashierId) ?? "Unknown",
    orderCount: r._count._all,
    totalSales: Number(r._sum.total ?? 0),
  }));
}

export async function salesByPaymentMethod(query: ReportQuery) {
  const rows = await prisma.payment.groupBy({
    by: ["method"],
    where: {
      transaction: {
        outletId: query.outletId,
        status: "COMPLETED",
        createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
      },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  return rows.map((r) => ({
    method: r.method,
    paymentCount: r._count._all,
    totalAmount: Number(r._sum.amount ?? 0),
  }));
}

// ── ReportData wrappers for the 4 legacy reports (JSON shape above stays
// unchanged for existing frontend hooks; these feed the export pipeline) ───

export async function salesSummaryReport(query: ReportQuery): Promise<ReportData> {
  const rows = await salesSummary(query);
  return {
    title: "Sales Summary",
    columns: [
      { key: "period", header: "Period", format: "date" },
      { key: "orderCount", header: "Orders", format: "number" },
      { key: "grossSales", header: "Gross Sales", format: "currency" },
      { key: "serviceChargeTotal", header: "Service Charge", format: "currency" },
      { key: "taxTotal", header: "Tax", format: "currency" },
      { key: "discountTotal", header: "Discount", format: "currency" },
    ],
    rows: rows.map((r) => ({ ...r, period: new Date(r.period).toISOString() })),
    meta: await buildMeta(query),
  };
}

export async function topProductsReport(query: ReportQuery): Promise<ReportData> {
  const rows = await topProducts(query);
  return {
    title: "Top Selling Products",
    columns: [
      { key: "name", header: "Product" },
      { key: "sku", header: "SKU" },
      { key: "quantitySold", header: "Quantity", format: "number" },
      { key: "revenue", header: "Revenue", format: "currency" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

export async function slowestProductsReport(query: ReportQuery): Promise<ReportData> {
  const rows = await prisma.$queryRaw<
    { product_id: string; name: string; sku: string; quantity_sold: bigint; revenue: string }[]
  >(Prisma.sql`
    SELECT
      p."id" AS product_id,
      p."name" AS name,
      p."sku" AS sku,
      SUM(ti."quantity")::bigint AS quantity_sold,
      SUM(ti."line_total")::text AS revenue
    FROM "transaction_items" ti
    JOIN "transactions" t ON t."id" = ti."transaction_id"
    JOIN "products" p ON p."id" = ti."product_id"
    WHERE t."outlet_id" = ${query.outletId}
      AND t."status" = 'COMPLETED'
      AND t."created_at" BETWEEN ${new Date(query.from)} AND ${new Date(query.to)}
    GROUP BY p."id", p."name", p."sku"
    ORDER BY quantity_sold ASC
    LIMIT ${query.limit}
  `);

  return {
    title: "Slowest Selling Products",
    columns: [
      { key: "name", header: "Product" },
      { key: "sku", header: "SKU" },
      { key: "quantitySold", header: "Quantity", format: "number" },
      { key: "revenue", header: "Revenue", format: "currency" },
    ],
    rows: rows.map((r) => ({
      name: r.name,
      sku: r.sku,
      quantitySold: Number(r.quantity_sold),
      revenue: Number(r.revenue ?? 0),
    })),
    meta: await buildMeta(query),
  };
}

export async function salesByCashierReport(query: ReportQuery): Promise<ReportData> {
  const rows = await salesByCashier(query);
  return {
    title: "Sales by Cashier",
    columns: [
      { key: "cashierName", header: "Staff Name" },
      { key: "orderCount", header: "Total Orders", format: "number" },
      { key: "totalSales", header: "Total Sales", format: "currency" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

export async function topCashiersReport(query: ReportQuery): Promise<ReportData> {
  const rows = (await salesByCashier(query)).sort((a, b) => b.totalSales - a.totalSales).slice(0, query.limit);
  return {
    title: "Top Cashiers by Sales",
    columns: [
      { key: "cashierName", header: "Staff Name" },
      { key: "orderCount", header: "Total Orders", format: "number" },
      { key: "totalSales", header: "Total Sales", format: "currency" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

export async function salesByPaymentMethodReport(query: ReportQuery): Promise<ReportData> {
  const rows = await salesByPaymentMethod(query);
  return {
    title: "Sales by Payment Method",
    columns: [
      { key: "method", header: "Payment Method" },
      { key: "paymentCount", header: "Quantity", format: "number" },
      { key: "totalAmount", header: "Amount", format: "currency" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

// ── Sales: new reports ──────────────────────────────────────────────────────

async function categorySales(outletId: number, from: string, to: string, categoryId?: number) {
  const rows = await prisma.$queryRaw<
    { category_id: number | null; category_name: string | null; quantity_sold: bigint; revenue: string }[]
  >(Prisma.sql`
    SELECT
      pc."id" AS category_id,
      COALESCE(pc."name", 'Uncategorized') AS category_name,
      SUM(ti."quantity")::bigint AS quantity_sold,
      SUM(ti."line_total")::text AS revenue
    FROM "transaction_items" ti
    JOIN "transactions" t ON t."id" = ti."transaction_id"
    JOIN "products" p ON p."id" = ti."product_id"
    LEFT JOIN "product_categories" pc ON pc."id" = p."category_id"
    WHERE t."outlet_id" = ${outletId}
      AND t."status" = 'COMPLETED'
      AND t."created_at" BETWEEN ${new Date(from)} AND ${new Date(to)}
      ${categoryId ? Prisma.sql`AND pc."id" = ${categoryId}` : Prisma.empty}
    GROUP BY pc."id", pc."name"
    ORDER BY revenue DESC
  `);

  return rows.map((r) => ({
    categoryId: r.category_id,
    categoryName: r.category_name,
    quantitySold: Number(r.quantity_sold),
    revenue: Number(r.revenue ?? 0),
  }));
}

export async function salesByCategoryReport(query: SalesByCategoryQuery): Promise<ReportData> {
  const rows = await categorySales(query.outletId, query.from, query.to, query.categoryId);
  return {
    title: "Sales by Category",
    columns: [
      { key: "categoryName", header: "Category" },
      { key: "quantitySold", header: "Quantity", format: "number" },
      { key: "revenue", header: "Revenue", format: "currency" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

export async function topCategoriesReport(query: ReportQuery): Promise<ReportData> {
  const rows = (await categorySales(query.outletId, query.from, query.to)).slice(0, query.limit);
  return {
    title: "Top Categories by Revenue",
    columns: [
      { key: "categoryName", header: "Category" },
      { key: "quantitySold", header: "Quantity", format: "number" },
      { key: "revenue", header: "Revenue", format: "currency" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

export async function topCustomersReport(query: ReportQuery): Promise<ReportData> {
  const rows = await prisma.$queryRaw<
    { customer_id: number; customer_name: string; order_count: bigint; total_spend: string; points_balance: number }[]
  >(Prisma.sql`
    SELECT
      c."id" AS customer_id,
      c."name" AS customer_name,
      COUNT(*)::bigint AS order_count,
      SUM(t."total")::text AS total_spend,
      c."points_balance" AS points_balance
    FROM "transactions" t
    JOIN "customers" c ON c."id" = t."customer_id"
    WHERE t."outlet_id" = ${query.outletId}
      AND t."status" = 'COMPLETED'
      AND t."created_at" BETWEEN ${new Date(query.from)} AND ${new Date(query.to)}
    GROUP BY c."id", c."name", c."points_balance"
    ORDER BY total_spend DESC
    LIMIT ${query.limit}
  `);

  return {
    title: "Top Customers by Spend",
    columns: [
      { key: "customerName", header: "Customer" },
      { key: "orderCount", header: "Orders", format: "number" },
      { key: "totalSpend", header: "Total Spend", format: "currency" },
      { key: "pointsBalance", header: "Points Balance", format: "number" },
    ],
    rows: rows.map((r) => ({
      customerName: r.customer_name,
      orderCount: Number(r.order_count),
      totalSpend: Number(r.total_spend ?? 0),
      pointsBalance: r.points_balance,
    })),
    meta: await buildMeta(query),
  };
}

export async function voidsRefundsReport(query: VoidsRefundsQuery): Promise<ReportData> {
  const rows = await prisma.transaction.findMany({
    where: {
      outletId: query.outletId,
      status: { in: ["VOIDED", "REFUNDED"] },
      createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
      ...(query.cashierId ? { cashierId: query.cashierId } : {}),
    },
    include: {
      cashier: { select: { name: true } },
      voidedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    title: "Voids & Refunds",
    columns: [
      { key: "receiptNumber", header: "Receipt #" },
      { key: "status", header: "Status" },
      { key: "total", header: "Amount", format: "currency" },
      { key: "cashierName", header: "Cashier" },
      { key: "voidedByName", header: "Voided By" },
      { key: "approvedByName", header: "Approved By" },
      { key: "voidReason", header: "Reason" },
      { key: "createdAt", header: "Date", format: "datetime" },
    ],
    rows: rows.map((t) => ({
      receiptNumber: t.receiptNumber ?? `#${t.id}`,
      status: t.status,
      total: Number(t.total),
      cashierName: t.cashier.name,
      voidedByName: t.voidedBy?.name ?? "",
      approvedByName: t.approvedBy?.name ?? "",
      voidReason: t.voidReason ?? "",
      createdAt: t.createdAt.toISOString(),
    })),
    meta: await buildMeta(query),
  };
}

export async function discountUsageReport(query: DiscountUsageQuery): Promise<ReportData> {
  const dateFilter = { gte: new Date(query.from), lte: new Date(query.to) };

  const [lineLevel, orderLevel] = await Promise.all([
    prisma.transactionItem.groupBy({
      by: ["discountId"],
      where: {
        discountId: { not: null },
        transaction: { outletId: query.outletId, status: "COMPLETED", createdAt: dateFilter },
      },
      _sum: { discountAmount: true },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ["orderDiscountId"],
      where: { orderDiscountId: { not: null }, outletId: query.outletId, status: "COMPLETED", createdAt: dateFilter },
      _sum: { discountTotal: true },
      _count: { _all: true },
    }),
  ]);

  const ids = [
    ...new Set(
      [...lineLevel.map((l) => l.discountId), ...orderLevel.map((o) => o.orderDiscountId)].filter(
        (id): id is number => id !== null
      )
    ),
  ];
  const discounts = await prisma.discount.findMany({ where: { id: { in: ids } } });
  const discountById = new Map(discounts.map((d) => [d.id, d]));

  const rows = ids
    .map((id) => {
      const line = lineLevel.find((l) => l.discountId === id);
      const order = orderLevel.find((o) => o.orderDiscountId === id);
      const discount = discountById.get(id);
      return {
        discountName: discount?.name ?? "Unknown",
        discountCode: discount?.code ?? "",
        usageCount: (line?._count._all ?? 0) + (order?._count._all ?? 0),
        totalDiscountGiven: Number(line?._sum.discountAmount ?? 0) + Number(order?._sum.discountTotal ?? 0),
      };
    })
    .sort((a, b) => b.totalDiscountGiven - a.totalDiscountGiven);

  return {
    title: "Discount & Promotion Usage",
    columns: [
      { key: "discountName", header: "Discount" },
      { key: "discountCode", header: "Code" },
      { key: "usageCount", header: "Times Used", format: "number" },
      { key: "totalDiscountGiven", header: "Total Discount Given", format: "currency" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

// ── Tax / Compliance ────────────────────────────────────────────────────────

export async function taxCollectedReport(query: TaxCollectedQuery): Promise<ReportData> {
  const rows = await prisma.$queryRaw<
    { tax_rate_id: number | null; tax_rate_name: string | null; rate: string | null; tax_collected: string; taxable_sales: string }[]
  >(Prisma.sql`
    SELECT
      tr."id" AS tax_rate_id,
      COALESCE(tr."name", 'No Tax') AS tax_rate_name,
      tr."rate" AS rate,
      SUM(ti."tax_amount")::text AS tax_collected,
      SUM(ti."line_total")::text AS taxable_sales
    FROM "transaction_items" ti
    JOIN "transactions" t ON t."id" = ti."transaction_id"
    JOIN "products" p ON p."id" = ti."product_id"
    LEFT JOIN "tax_rates" tr ON tr."id" = p."tax_rate_id"
    WHERE t."outlet_id" = ${query.outletId}
      AND t."status" = 'COMPLETED'
      AND t."created_at" BETWEEN ${new Date(query.from)} AND ${new Date(query.to)}
    GROUP BY tr."id", tr."name", tr."rate"
    ORDER BY tax_collected DESC
  `);

  return {
    title: "SST / Tax Collected",
    columns: [
      { key: "taxRateName", header: "Tax Rate" },
      { key: "rate", header: "Rate %", format: "percent" },
      { key: "taxableSales", header: "Taxable Sales", format: "currency" },
      { key: "taxCollected", header: "Tax Collected", format: "currency" },
    ],
    rows: rows.map((r) => ({
      taxRateName: r.tax_rate_name,
      rate: r.rate ? Number(r.rate) : 0,
      taxableSales: Number(r.taxable_sales ?? 0),
      taxCollected: Number(r.tax_collected ?? 0),
    })),
    meta: await buildMeta(query),
  };
}

export async function einvoiceStatusReport(query: EinvoiceStatusQuery): Promise<ReportData> {
  const rows = await prisma.transaction.groupBy({
    by: ["einvoiceStatus"],
    where: {
      outletId: query.outletId,
      createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
      ...(query.einvoiceStatus ? { einvoiceStatus: query.einvoiceStatus } : {}),
    },
    _count: { _all: true },
    _sum: { total: true },
  });

  return {
    title: "E-Invoice (MyInvois) Status",
    columns: [
      { key: "status", header: "Status" },
      { key: "count", header: "Transactions", format: "number" },
      { key: "totalAmount", header: "Total Amount", format: "currency" },
    ],
    rows: rows.map((r) => ({
      status: r.einvoiceStatus,
      count: r._count._all,
      totalAmount: Number(r._sum.total ?? 0),
    })),
    meta: await buildMeta(query),
  };
}

// ── Audit ────────────────────────────────────────────────────────────────────

export async function auditLogReport(query: AuditLogQuery): Promise<ReportData> {
  const rows = await prisma.auditLog.findMany({
    where: {
      ...(query.outletId ? { outletId: query.outletId } : {}),
      createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    },
    include: { user: { select: { name: true } }, outlet: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  return {
    title: "Audit Log",
    columns: [
      { key: "createdAt", header: "Date", format: "datetime" },
      { key: "action", header: "Action" },
      { key: "entityType", header: "Entity Type" },
      { key: "entityId", header: "Entity ID", format: "number" },
      { key: "userName", header: "Performed By" },
      { key: "outletName", header: "Outlet" },
    ],
    rows: rows.map((r) => ({
      createdAt: r.createdAt.toISOString(),
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      userName: r.user.name,
      outletName: r.outlet?.name ?? "",
    })),
    meta: await buildMeta(query),
  };
}
