import { prisma } from "../../lib/prisma";
import { buildMeta } from "../reports/export/reportMeta";
import { ReportData } from "../reports/types";
import { ReportQuery } from "../reports/validation";

export async function poSummaryReport(query: ReportQuery): Promise<ReportData> {
  const orders = await prisma.purchaseOrder.findMany({
    where: { outletId: query.outletId, createdAt: { gte: new Date(query.from), lte: new Date(query.to) } },
    include: { supplier: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = orders.map((po) => ({
    poNumber: po.poNumber,
    supplierName: po.supplier.name,
    status: po.status,
    itemCount: po.items.length,
    orderValue: Number(po.total),
    orderedAt: po.orderedAt?.toISOString() ?? "",
    receivedAt: po.receivedAt?.toISOString() ?? "",
  }));

  return {
    title: "Purchase Orders Summary",
    columns: [
      { key: "poNumber", header: "PO #" },
      { key: "supplierName", header: "Supplier" },
      { key: "status", header: "Status" },
      { key: "itemCount", header: "Line Items", format: "number" },
      { key: "orderValue", header: "Order Value", format: "currency" },
      { key: "orderedAt", header: "Ordered", format: "datetime" },
      { key: "receivedAt", header: "Received", format: "datetime" },
    ],
    rows,
    totals: { orderValue: rows.reduce((sum, r) => sum + r.orderValue, 0) },
    meta: await buildMeta(query),
  };
}
