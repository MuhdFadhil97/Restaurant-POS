import { Prisma, TransactionStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { localDateOnlyUtc, sqlTimestamp } from "../../lib/dateOnly";
import { round2 } from "../transactions/calculations";
import { listLowStock } from "../inventory/service";

const COMPLETED_STATUSES: TransactionStatus[] = ["COMPLETED", "REFUNDED"];

async function salesWindow(outletId: number, gte: Date, lt: Date) {
  const result = await prisma.transaction.aggregate({
    where: { outletId, status: { in: COMPLETED_STATUSES }, createdAt: { gte, lt } },
    _sum: { total: true },
    _count: { _all: true },
  });

  const grossSales = Number(result._sum?.total ?? 0);
  const orderCount = result._count?._all ?? 0;
  return { grossSales, orderCount, avgTicket: orderCount > 0 ? round2(grossSales / orderCount) : null };
}

function deltaPct(today: number, yesterday: number): number | null {
  if (yesterday === 0) return null;
  return round2(((today - yesterday) / yesterday) * 100);
}

async function topProductsToday(outletId: number, todayStart: Date, todayEnd: Date) {
  const rows = await prisma.$queryRaw<
    { product_id: number; name: string; sku: string; quantity_sold: bigint; revenue: string }[]
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
    WHERE t."outlet_id" = ${outletId}
      AND t."status" = 'COMPLETED'
      AND t."created_at" >= ${sqlTimestamp(todayStart)} AND t."created_at" < ${sqlTimestamp(todayEnd)}
    GROUP BY p."id", p."name", p."sku"
    ORDER BY quantity_sold DESC
    LIMIT 5
  `);

  return rows.map((r) => ({
    productId: Number(r.product_id),
    name: r.name,
    sku: r.sku,
    quantitySold: Number(r.quantity_sold),
    revenue: Number(r.revenue ?? 0),
  }));
}

async function paymentMixToday(outletId: number, todayStart: Date, todayEnd: Date) {
  const rows = await prisma.payment.groupBy({
    by: ["method"],
    where: {
      transaction: { outletId, status: "COMPLETED", createdAt: { gte: todayStart, lt: todayEnd } },
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

async function lowStockTop(outletId: number) {
  const stocks = await listLowStock(outletId);
  return stocks
    .map((s) => ({
      productId: s.product.id,
      name: s.product.name,
      sku: s.product.sku,
      quantityOnHand: s.quantity,
      lowStockThreshold: s.product.lowStockThreshold,
    }))
    .sort((a, b) => b.lowStockThreshold - b.quantityOnHand - (a.lowStockThreshold - a.quantityOnHand))
    .slice(0, 10);
}

async function openCashSessions(outletId: number) {
  const sessions = await prisma.cashSession.findMany({
    where: { outletId, status: "OPEN" },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { openedAt: "asc" },
  });

  return Promise.all(
    sessions.map(async (session) => {
      const cashPayments = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          method: "CASH",
          transaction: { outletId, status: "COMPLETED", createdAt: { gte: session.openedAt } },
        },
      });

      const expectedCash = round2(Number(session.openingCash) + Number(cashPayments._sum.amount ?? 0));

      return {
        id: session.id,
        userId: session.userId,
        userName: session.user.name,
        openingCash: Number(session.openingCash),
        expectedCash,
        openedAt: session.openedAt.toISOString(),
      };
    })
  );
}

async function staffOnDuty(outletId: number) {
  const records = await prisma.staffAttendance.findMany({
    where: { outletId, status: { not: "CLOCKED_OUT" } },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { clockInAt: "asc" },
  });

  return records.map((r) => ({
    attendanceId: r.id,
    userId: r.userId,
    userName: r.user.name,
    role: r.user.role,
    status: r.status as "CLOCKED_IN" | "ON_BREAK",
    clockInAt: r.clockInAt.toISOString(),
  }));
}

export async function getSummary(outletId: number) {
  const now = new Date();
  const todayStart = localDateOnlyUtc(now);
  const todayEnd = localDateOnlyUtc(now, 1);
  const yesterdayStart = localDateOnlyUtc(now, -1);

  const [today, yesterday, topProducts, paymentMix, lowStock, cashSessions, staff] = await Promise.all([
    salesWindow(outletId, todayStart, todayEnd),
    salesWindow(outletId, yesterdayStart, todayStart),
    topProductsToday(outletId, todayStart, todayEnd),
    paymentMixToday(outletId, todayStart, todayEnd),
    lowStockTop(outletId),
    openCashSessions(outletId),
    staffOnDuty(outletId),
  ]);

  return {
    sales: {
      today,
      yesterday,
      grossSalesDeltaPct: deltaPct(today.grossSales, yesterday.grossSales),
      orderCountDeltaPct: deltaPct(today.orderCount, yesterday.orderCount),
    },
    topProducts,
    paymentMix,
    lowStock,
    cashSessions,
    staffOnDuty: staff,
  };
}
