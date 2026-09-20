import { useOutletStore } from "@/store/outletStore";
import { useDashboardSummary } from "@/api/dashboard";
import { ErrorMessage, Spinner } from "@/components/ui";
import { KpiTileRow } from "./components/KpiTileRow";
import { TopProductsCard } from "./components/TopProductsCard";
import { PaymentMixCard } from "./components/PaymentMixCard";
import { LowStockCard } from "./components/LowStockCard";
import { CashSessionsCard } from "./components/CashSessionsCard";
import { StaffOnDutyCard } from "./components/StaffOnDutyCard";

export function DashboardPage() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const { data, isLoading, isError } = useDashboardSummary(activeOutletId);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {!activeOutletId ? (
        <p className="text-sm text-gray-400">Select an outlet to view its dashboard.</p>
      ) : isLoading ? (
        <Spinner />
      ) : isError || !data ? (
        <ErrorMessage message="Failed to load dashboard data." />
      ) : (
        <>
          <KpiTileRow
            today={data.sales.today}
            grossSalesDeltaPct={data.sales.grossSalesDeltaPct}
            orderCountDeltaPct={data.sales.orderCountDeltaPct}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopProductsCard rows={data.topProducts} />
            <PaymentMixCard rows={data.paymentMix} />
            <LowStockCard rows={data.lowStock} />
            <CashSessionsCard rows={data.cashSessions} />
            <StaffOnDutyCard rows={data.staffOnDuty} />
          </div>
        </>
      )}
    </div>
  );
}
