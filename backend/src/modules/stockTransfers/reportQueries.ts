import { prisma } from "../../lib/prisma";
import { buildMeta } from "../reports/export/reportMeta";
import { ReportData } from "../reports/types";
import { StockTransferQuery } from "../reports/validation";

export async function transferRegisterReport(query: StockTransferQuery): Promise<ReportData> {
  const transfers = await prisma.stockTransfer.findMany({
    where: {
      createdAt: { gte: new Date(query.from), lte: new Date(query.to) },
      ...(query.outletId ? { OR: [{ fromOutletId: query.outletId }, { toOutletId: query.outletId }] } : {}),
      ...(query.fromOutletId ? { fromOutletId: query.fromOutletId } : {}),
      ...(query.toOutletId ? { toOutletId: query.toOutletId } : {}),
    },
    include: { fromOutlet: true, toOutlet: true, requestedBy: { select: { name: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = transfers.map((t) => ({
    transferId: t.id,
    fromOutletName: t.fromOutlet.name,
    toOutletName: t.toOutlet.name,
    status: t.status,
    itemCount: t.items.length,
    totalQuantity: t.items.reduce((sum, i) => sum + i.quantity, 0),
    requestedByName: t.requestedBy.name,
    createdAt: t.createdAt.toISOString(),
  }));

  return {
    title: "Stock Transfer Register",
    columns: [
      { key: "transferId", header: "Transfer #", format: "number" },
      { key: "fromOutletName", header: "From Outlet" },
      { key: "toOutletName", header: "To Outlet" },
      { key: "status", header: "Status" },
      { key: "itemCount", header: "Line Items", format: "number" },
      { key: "totalQuantity", header: "Total Qty", format: "number" },
      { key: "requestedByName", header: "Requested By" },
      { key: "createdAt", header: "Date", format: "datetime" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}
