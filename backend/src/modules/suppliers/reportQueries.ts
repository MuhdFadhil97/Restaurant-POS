import { prisma } from "../../lib/prisma";
import { buildMeta } from "../reports/export/reportMeta";
import { ReportData } from "../reports/types";
import { ReportQuery } from "../reports/validation";

export async function supplierPerformanceReport(query: ReportQuery): Promise<ReportData> {
  const orders = await prisma.purchaseOrder.findMany({
    where: { outletId: query.outletId, createdAt: { gte: new Date(query.from), lte: new Date(query.to) } },
    include: {
      supplier: true,
      goodsReceivedNotes: { include: { items: true } },
    },
  });

  const bySupplier = new Map<
    number,
    { supplierName: string; poCount: number; totalSpend: number; leadTimes: number[]; received: number; rejected: number }
  >();

  for (const po of orders) {
    const entry = bySupplier.get(po.supplierId) ?? {
      supplierName: po.supplier.name,
      poCount: 0,
      totalSpend: 0,
      leadTimes: [],
      received: 0,
      rejected: 0,
    };
    entry.poCount += 1;
    if (po.orderedAt && po.receivedAt) {
      entry.leadTimes.push((po.receivedAt.getTime() - po.orderedAt.getTime()) / (1000 * 60 * 60 * 24));
    }
    for (const grn of po.goodsReceivedNotes) {
      for (const item of grn.items) {
        entry.totalSpend += item.quantityReceived * Number(item.unitCost);
        entry.received += item.quantityReceived;
        entry.rejected += item.quantityRejected;
      }
    }
    bySupplier.set(po.supplierId, entry);
  }

  const rows = Array.from(bySupplier.values())
    .map((s) => ({
      supplierName: s.supplierName,
      poCount: s.poCount,
      totalSpend: s.totalSpend,
      avgLeadTimeDays: s.leadTimes.length ? Math.round((s.leadTimes.reduce((a, b) => a + b, 0) / s.leadTimes.length) * 10) / 10 : 0,
      rejectionRate: s.received + s.rejected > 0 ? Math.round((s.rejected / (s.received + s.rejected)) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  return {
    title: "Supplier Performance",
    columns: [
      { key: "supplierName", header: "Supplier" },
      { key: "poCount", header: "Purchase Orders", format: "number" },
      { key: "totalSpend", header: "Total Spend", format: "currency" },
      { key: "avgLeadTimeDays", header: "Avg Lead Time (days)", format: "number" },
      { key: "rejectionRate", header: "Rejection Rate %", format: "percent" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}
