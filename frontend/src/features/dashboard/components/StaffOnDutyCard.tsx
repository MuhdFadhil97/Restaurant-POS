import { Card } from "@/components/ui";
import { ReportColumn } from "@/api/reports";
import { GenericReportTable } from "@/features/reports/components/GenericReportTable";
import { DashboardStaffOnDuty } from "@/api/dashboard";

const columns: ReportColumn[] = [
  { key: "userName", header: "Name", format: "text" },
  { key: "role", header: "Role", format: "text" },
  { key: "status", header: "Status", format: "text" },
  { key: "clockInAt", header: "Clocked In At", format: "datetime" },
];

export function StaffOnDutyCard({ rows }: { rows: DashboardStaffOnDuty[] }) {
  const tableRows = rows.map((r) => ({
    ...r,
    status: r.status === "ON_BREAK" ? "On Break" : "Clocked In",
  }));

  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-3">Staff On Duty</h2>
      <GenericReportTable columns={columns} rows={tableRows as unknown as Record<string, unknown>[]} />
    </Card>
  );
}
