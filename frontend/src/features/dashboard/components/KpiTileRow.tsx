import { Badge, Card } from "@/components/ui";
import { money } from "@/features/pos/cartMath";
import { DashboardSalesWindow } from "@/api/dashboard";

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <Badge color="gray">N/A</Badge>;
  const color = pct > 0 ? "green" : pct < 0 ? "red" : "gray";
  const sign = pct > 0 ? "+" : "";
  return <Badge color={color}>{`${sign}${pct.toFixed(1)}% vs yesterday`}</Badge>;
}

function KpiTile({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {delta !== undefined && <div className="mt-2">
        <DeltaBadge pct={delta} />
      </div>}
    </Card>
  );
}

export function KpiTileRow({
  today,
  grossSalesDeltaPct,
  orderCountDeltaPct,
}: {
  today: DashboardSalesWindow;
  grossSalesDeltaPct: number | null;
  orderCountDeltaPct: number | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiTile label="Gross Sales Today" value={money(today.grossSales)} delta={grossSalesDeltaPct} />
      <KpiTile label="Orders Today" value={today.orderCount.toLocaleString()} delta={orderCountDeltaPct} />
      <KpiTile label="Avg Ticket" value={today.avgTicket !== null ? money(today.avgTicket) : "N/A"} />
    </div>
  );
}
