import { prisma } from "../../lib/prisma";
import { buildMeta } from "../reports/export/reportMeta";
import { ReportData } from "../reports/types";
import { ReportQuery } from "../reports/validation";

export async function customerSegmentationReport(query: ReportQuery): Promise<ReportData> {
  const transactions = await prisma.transaction.findMany({
    where: {
      outletId: query.outletId,
      status: "COMPLETED",
      customerId: { not: null },
      createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
    },
    include: { customer: true },
  });

  const byCustomer = new Map<
    number,
    { name: string; source: string; pointsBalance: number; orderCount: number; totalSpend: number; lastVisit: Date }
  >();

  for (const t of transactions) {
    if (!t.customer) continue;
    const entry = byCustomer.get(t.customer.id) ?? {
      name: t.customer.name,
      source: t.customer.source ?? "WALK_IN",
      pointsBalance: t.customer.pointsBalance,
      orderCount: 0,
      totalSpend: 0,
      lastVisit: t.createdAt,
    };
    entry.orderCount += 1;
    entry.totalSpend += Number(t.total);
    if (t.createdAt > entry.lastVisit) entry.lastVisit = t.createdAt;
    byCustomer.set(t.customer.id, entry);
  }

  const rows = Array.from(byCustomer.values())
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .map((c) => ({
      customerName: c.name,
      source: c.source,
      pointsBalance: c.pointsBalance,
      orderCount: c.orderCount,
      totalSpend: c.totalSpend,
      lastVisit: c.lastVisit.toISOString(),
    }));

  return {
    title: "Customer List / Segmentation",
    columns: [
      { key: "customerName", header: "Customer" },
      { key: "source", header: "Source" },
      { key: "orderCount", header: "Orders", format: "number" },
      { key: "totalSpend", header: "Total Spend", format: "currency" },
      { key: "pointsBalance", header: "Points Balance", format: "number" },
      { key: "lastVisit", header: "Last Visit", format: "datetime" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

export async function loyaltyLedgerReport(query: ReportQuery): Promise<ReportData> {
  const transactions = await prisma.transaction.findMany({
    where: {
      outletId: query.outletId,
      status: "COMPLETED",
      customerId: { not: null },
      OR: [{ pointsEarned: { gt: 0 } }, { pointsRedeemed: { gt: 0 } }],
      createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
    },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = transactions.map((t) => ({
    createdAt: t.createdAt.toISOString(),
    customerName: t.customer?.name ?? "",
    receiptNumber: t.receiptNumber ?? `#${t.id}`,
    pointsEarned: t.pointsEarned,
    pointsRedeemed: t.pointsRedeemed,
    netChange: t.pointsEarned - t.pointsRedeemed,
  }));

  return {
    title: "Loyalty Points Ledger",
    columns: [
      { key: "createdAt", header: "Date", format: "datetime" },
      { key: "customerName", header: "Customer" },
      { key: "receiptNumber", header: "Receipt #" },
      { key: "pointsEarned", header: "Points Earned", format: "number" },
      { key: "pointsRedeemed", header: "Points Redeemed", format: "number" },
      { key: "netChange", header: "Net Change", format: "number" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}
