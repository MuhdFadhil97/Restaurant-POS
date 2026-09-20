import { Card } from "@/components/ui";
import { ReportColumn } from "@/api/reports";
import { GenericReportTable } from "@/features/reports/components/GenericReportTable";
import { DashboardTopProduct } from "@/api/dashboard";

const columns: ReportColumn[] = [
  { key: "name", header: "Product", format: "text" },
  { key: "sku", header: "SKU", format: "text" },
  { key: "quantitySold", header: "Qty Sold", format: "number" },
  { key: "revenue", header: "Revenue", format: "currency" },
];

export function TopProductsCard({ rows }: { rows: DashboardTopProduct[] }) {
  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-3">Top Products Today</h2>
      <GenericReportTable columns={columns} rows={rows as unknown as Record<string, unknown>[]} />
    </Card>
  );
}
