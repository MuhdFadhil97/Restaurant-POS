import { Card } from "@/components/ui";
import { ReportColumn } from "@/api/reports";
import { GenericReportTable } from "@/features/reports/components/GenericReportTable";
import { DashboardPaymentMix } from "@/api/dashboard";

const columns: ReportColumn[] = [
  { key: "method", header: "Method", format: "text" },
  { key: "paymentCount", header: "Payments", format: "number" },
  { key: "totalAmount", header: "Total", format: "currency" },
];

export function PaymentMixCard({ rows }: { rows: DashboardPaymentMix[] }) {
  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-3">Payment Mix Today</h2>
      <GenericReportTable columns={columns} rows={rows as unknown as Record<string, unknown>[]} />
    </Card>
  );
}
