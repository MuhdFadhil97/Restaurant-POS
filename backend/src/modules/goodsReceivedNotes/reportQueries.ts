import { prisma } from "../../lib/prisma";
import { buildMeta } from "../reports/export/reportMeta";
import { ReportData } from "../reports/types";
import { ReportQuery } from "../reports/validation";

export async function receivingDiscrepanciesReport(query: ReportQuery): Promise<ReportData> {
  const grns = await prisma.goodsReceivedNote.findMany({
    where: { outletId: query.outletId, receivedAt: { gte: new Date(query.from), lte: new Date(query.to) } },
    include: {
      purchaseOrder: { include: { supplier: true } },
      items: { include: { product: true, variant: true } },
    },
    orderBy: { receivedAt: "desc" },
  });

  const rows = grns.flatMap((grn) =>
    grn.items
      .filter((item) => item.quantityRejected > 0)
      .map((item) => ({
        receivedAt: grn.receivedAt.toISOString(),
        supplierName: grn.purchaseOrder.supplier.name,
        productName: item.variant ? `${item.product.name} (${item.variant.value})` : item.product.name,
        quantityReceived: item.quantityReceived,
        quantityRejected: item.quantityRejected,
        rejectionReason: item.rejectionReason ?? "",
      }))
  );

  return {
    title: "Goods Received / Receiving Discrepancies",
    columns: [
      { key: "receivedAt", header: "Date", format: "datetime" },
      { key: "supplierName", header: "Supplier" },
      { key: "productName", header: "Product" },
      { key: "quantityReceived", header: "Accepted", format: "number" },
      { key: "quantityRejected", header: "Rejected", format: "number" },
      { key: "rejectionReason", header: "Reason" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}
