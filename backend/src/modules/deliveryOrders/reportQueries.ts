import { prisma } from "../../lib/prisma";
import { buildMeta } from "../reports/export/reportMeta";
import { ReportData } from "../reports/types";
import { ReportQuery } from "../reports/validation";

// The one place archived delivery orders are still visible — the Kanban
// (deliveryOrders/service.ts listOrders) always excludes archivedAt, since
// that board is for active work, not history. This report has no such
// filter on purpose: it's the answer to "where did my archived order go."
export async function deliveryOrdersReport(query: ReportQuery): Promise<ReportData> {
  const orders = await prisma.deliveryOrder.findMany({
    where: {
      outletId: query.outletId,
      createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
    },
    include: {
      platform: { select: { provider: true, name: true } },
      transaction: { select: { receiptNumber: true, total: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = orders.map((o) => ({
    createdAt: o.createdAt.toISOString(),
    externalOrderId: o.externalOrderId,
    platform: o.platform.name,
    customerName: o.customerName ?? "",
    status: o.status,
    receiptNumber: o.transaction?.receiptNumber ?? "",
    total: o.transaction ? Number(o.transaction.total) : 0,
    acceptedAt: o.acceptedAt?.toISOString() ?? "",
    pickedUpAt: o.pickedUpAt?.toISOString() ?? "",
    archived: o.archivedAt ? "Yes" : "No",
  }));

  const totalRevenue = rows.reduce((sum, r) => sum + r.total, 0);

  return {
    title: "Delivery Orders",
    columns: [
      { key: "createdAt", header: "Received", format: "datetime" },
      { key: "externalOrderId", header: "Order #" },
      { key: "platform", header: "Platform" },
      { key: "customerName", header: "Customer" },
      { key: "status", header: "Status" },
      { key: "receiptNumber", header: "Receipt #" },
      { key: "total", header: "Total", format: "currency" },
      { key: "acceptedAt", header: "Accepted", format: "datetime" },
      { key: "pickedUpAt", header: "Picked Up", format: "datetime" },
      { key: "archived", header: "Archived" },
    ],
    rows,
    meta: await buildMeta(query),
    totals: { total: totalRevenue },
  };
}

// Revenue/volume per connected platform — answers "which platform is
// actually worth the commission" once there's more than one connected.
// commissionAmount is deliberately left out: no adapter populates it yet
// (only CUSTOM is wired up, and it has no payout-reporting API), so a
// column of all-zero would be misleading rather than merely empty.
export async function deliveryPlatformPerformanceReport(query: ReportQuery): Promise<ReportData> {
  const orders = await prisma.deliveryOrder.findMany({
    where: {
      outletId: query.outletId,
      createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
    },
    include: {
      platform: { select: { id: true, name: true, provider: true } },
      transaction: { select: { total: true } },
    },
  });

  const byPlatform = new Map<
    number,
    { name: string; provider: string; received: number; accepted: number; rejected: number; revenue: number }
  >();

  for (const o of orders) {
    const entry = byPlatform.get(o.platform.id) ?? {
      name: o.platform.name,
      provider: o.platform.provider,
      received: 0,
      accepted: 0,
      rejected: 0,
      revenue: 0,
    };
    entry.received += 1;
    if (o.status === "REJECTED") entry.rejected += 1;
    if (o.status !== "PENDING" && o.status !== "REJECTED") entry.accepted += 1;
    if (o.transaction) entry.revenue += Number(o.transaction.total);
    byPlatform.set(o.platform.id, entry);
  }

  const rows = Array.from(byPlatform.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((p) => ({
      platform: p.name,
      provider: p.provider,
      ordersReceived: p.received,
      accepted: p.accepted,
      rejected: p.rejected,
      acceptRate: p.received > 0 ? Math.round((p.accepted / p.received) * 100) : 0,
      revenue: p.revenue,
    }));

  return {
    title: "Revenue by Delivery Platform",
    columns: [
      { key: "platform", header: "Platform" },
      { key: "provider", header: "Provider" },
      { key: "ordersReceived", header: "Received", format: "number" },
      { key: "accepted", header: "Accepted", format: "number" },
      { key: "rejected", header: "Rejected", format: "number" },
      { key: "acceptRate", header: "Accept Rate", format: "percent" },
      { key: "revenue", header: "Revenue", format: "currency" },
    ],
    rows,
    meta: await buildMeta(query),
    totals: { revenue: rows.reduce((sum, r) => sum + r.revenue, 0) },
  };
}

// Rejection reasons, most frequent first — surfaces a recurring problem
// (e.g. the same unmapped SKU rejected over and over) that's easy to miss
// order-by-order on the Kanban but obvious once counted.
export async function deliveryRejectionsReport(query: ReportQuery): Promise<ReportData> {
  const [received, rejected] = await Promise.all([
    prisma.deliveryOrder.count({
      where: { outletId: query.outletId, createdAt: { gte: new Date(query.from), lte: new Date(query.to) } },
    }),
    prisma.deliveryOrder.findMany({
      where: {
        outletId: query.outletId,
        status: "REJECTED",
        createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
      },
      select: { rejectedReason: true },
    }),
  ]);

  const byReason = new Map<string, number>();
  for (const r of rejected) {
    const reason = r.rejectedReason?.trim() || "(no reason given)";
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  }

  const rows = Array.from(byReason.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));

  const rejectionRate = received > 0 ? Math.round((rejected.length / received) * 100) : 0;
  const meta = await buildMeta(query);

  return {
    title: "Delivery Rejection Reasons",
    columns: [
      { key: "reason", header: "Reason" },
      { key: "count", header: "Times Rejected", format: "number" },
    ],
    rows,
    meta: {
      ...meta,
      filtersApplied: { ...meta.filtersApplied, ordersReceived: received, rejectionRatePct: rejectionRate },
    },
    totals: { count: rejected.length },
  };
}

// Accept→ready and ready→picked-up timings for orders that completed the
// full lifecycle in this range — flags a slow kitchen (long prep) or a slow
// courier/pickup process (long wait) separately, rather than one blended
// number. Only orders with all three timestamps are included; an order
// still mid-flight has nothing to measure yet.
export async function deliveryFulfillmentTimeReport(query: ReportQuery): Promise<ReportData> {
  const orders = await prisma.deliveryOrder.findMany({
    where: {
      outletId: query.outletId,
      status: "PICKED_UP",
      acceptedAt: { not: null },
      readyAt: { not: null },
      pickedUpAt: { not: null },
      createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
    },
    include: { platform: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const minutes = (a: Date, b: Date) => Math.round(((b.getTime() - a.getTime()) / 60000) * 10) / 10;

  const rows = orders.map((o) => ({
    createdAt: o.createdAt.toISOString(),
    externalOrderId: o.externalOrderId,
    platform: o.platform.name,
    acceptMinutes: minutes(o.createdAt, o.acceptedAt!),
    prepMinutes: minutes(o.acceptedAt!, o.readyAt!),
    pickupWaitMinutes: minutes(o.readyAt!, o.pickedUpAt!),
    totalMinutes: minutes(o.createdAt, o.pickedUpAt!),
  }));

  const avg = (key: keyof (typeof rows)[number]) =>
    rows.length > 0 ? Math.round((rows.reduce((sum, r) => sum + (r[key] as number), 0) / rows.length) * 10) / 10 : 0;

  return {
    title: "Delivery Fulfillment Time",
    columns: [
      { key: "createdAt", header: "Received", format: "datetime" },
      { key: "externalOrderId", header: "Order #" },
      { key: "platform", header: "Platform" },
      { key: "acceptMinutes", header: "Time to Accept (min)", format: "number" },
      { key: "prepMinutes", header: "Prep Time (min)", format: "number" },
      { key: "pickupWaitMinutes", header: "Pickup Wait (min)", format: "number" },
      { key: "totalMinutes", header: "Total (min)", format: "number" },
    ],
    rows,
    meta: await buildMeta(query),
    totals: {
      acceptMinutes: avg("acceptMinutes"),
      prepMinutes: avg("prepMinutes"),
      pickupWaitMinutes: avg("pickupWaitMinutes"),
      totalMinutes: avg("totalMinutes"),
    },
  };
}
