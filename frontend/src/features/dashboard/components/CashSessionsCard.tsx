import { Card } from "@/components/ui";
import { ReportColumn } from "@/api/reports";
import { GenericReportTable } from "@/features/reports/components/GenericReportTable";
import { DashboardCashSession } from "@/api/dashboard";

const columns: ReportColumn[] = [
  { key: "userName", header: "Cashier", format: "text" },
  { key: "openingCash", header: "Opening Cash", format: "currency" },
  { key: "expectedCash", header: "Expected Cash", format: "currency" },
  { key: "openedAt", header: "Opened At", format: "datetime" },
];

export function CashSessionsCard({ rows }: { rows: DashboardCashSession[] }) {
  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-3">Open Cash Sessions</h2>
      <GenericReportTable columns={columns} rows={rows as unknown as Record<string, unknown>[]} />
    </Card>
  );
}
