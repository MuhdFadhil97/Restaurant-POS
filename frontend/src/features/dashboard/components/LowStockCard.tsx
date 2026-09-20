import { Card } from "@/components/ui";
import { ReportColumn } from "@/api/reports";
import { GenericReportTable } from "@/features/reports/components/GenericReportTable";
import { DashboardLowStockItem } from "@/api/dashboard";

const columns: ReportColumn[] = [
  { key: "name", header: "Product", format: "text" },
  { key: "sku", header: "SKU", format: "text" },
  { key: "quantityOnHand", header: "On Hand", format: "number" },
  { key: "lowStockThreshold", header: "Threshold", format: "number" },
  { key: "status", header: "Status", format: "text" },
];

export function LowStockCard({ rows }: { rows: DashboardLowStockItem[] }) {
  const tableRows = rows.map((r) => ({
    ...r,
    status: r.quantityOnHand === 0 ? "Out of stock" : "Low stock",
  }));

  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-3">Low Stock Alerts</h2>
      <GenericReportTable columns={columns} rows={tableRows as unknown as Record<string, unknown>[]} />
    </Card>
  );
}
