import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ReportQuery } from "./validation";

const COMPLETED_STATUSES = Prisma.sql`('COMPLETED', 'REFUNDED')`;

export async function salesSummary(query: ReportQuery) {
  const bucket = query.groupBy; // validated to day|week|month, safe to interpolate

  const rows = await prisma.$queryRaw<
    { bucket: Date; order_count: bigint; gross_sales: string; tax_total: string; discount_total: string }[]
  >(Prisma.sql`
    SELECT
      date_trunc(${bucket}, "created_at") AS bucket,
      COUNT(*)::bigint AS order_count,
      SUM("total")::text AS gross_sales,
      SUM("tax_total")::text AS tax_total,
      SUM("discount_total")::text AS discount_total
    FROM "transactions"
    WHERE "outlet_id" = ${query.outletId}::uuid
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
    WHERE t."outlet_id" = ${query.outletId}::uuid
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
