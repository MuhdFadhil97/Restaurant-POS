import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { ReportCard } from "./components/ReportCard";
import { ReportFilterBar, startOfTodayDateInput, toIsoRange } from "./components/ReportFilterBar";

export function TopPerformersTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [range, setRange] = useState({ from: startOfTodayDateInput(), to: startOfTodayDateInput() });

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  const params = { outletId, ...toIsoRange(range), limit: 10 };

  return (
    <div className="space-y-6">
      <ReportFilterBar range={range} onRangeChange={setRange} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportCard reportKey="top-products" params={params} />
        <ReportCard reportKey="top-categories" params={params} />
        <ReportCard reportKey="top-cashiers" params={params} />
        <ReportCard reportKey="top-customers" params={params} />
        <ReportCard reportKey="slowest-products" params={params} />
      </div>
    </div>
  );
}
