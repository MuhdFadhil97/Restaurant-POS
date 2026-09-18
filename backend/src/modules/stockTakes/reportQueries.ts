import { prisma } from "../../lib/prisma";
import { buildMeta } from "../reports/export/reportMeta";
import { ReportData } from "../reports/types";
import { ReportQuery } from "../reports/validation";

export async function stockTakeVarianceReport(query: ReportQuery): Promise<ReportData> {
  const stockTakes = await prisma.stockTake.findMany({
    where: {
      outletId: query.outletId,
      status: "COMPLETED",
      completedAt: { gte: new Date(query.from), lte: new Date(query.to) },
    },
    include: { items: { include: { product: true, variant: true } } },
    orderBy: { completedAt: "desc" },
  });

  const rows = stockTakes.flatMap((st) =>
    st.items
      .filter((item) => item.countedQuantity !== null && item.countedQuantity !== item.systemQuantity)
      .map((item) => ({
        stockTakeId: st.id,
        completedAt: st.completedAt?.toISOString() ?? "",
        productName: item.variant ? `${item.product.name} (${item.variant.value})` : item.product.name,
        systemQuantity: item.systemQuantity,
        countedQuantity: item.countedQuantity as number,
        variance: (item.countedQuantity as number) - item.systemQuantity,
      }))
  );

  return {
    title: "Stock Take Variance",
    columns: [
      { key: "completedAt", header: "Completed", format: "datetime" },
      { key: "stockTakeId", header: "Stock Take #", format: "number" },
      { key: "productName", header: "Product" },
      { key: "systemQuantity", header: "System Qty", format: "number" },
      { key: "countedQuantity", header: "Counted Qty", format: "number" },
      { key: "variance", header: "Variance", format: "number" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}
