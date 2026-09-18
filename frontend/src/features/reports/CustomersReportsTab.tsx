import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { ReportCard } from "./components/ReportCard";
import { ReportFilterBar, startOfTodayDateInput, toIsoRange } from "./components/ReportFilterBar";

export function CustomersReportsTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [range, setRange] = useState({ from: startOfTodayDateInput(), to: startOfTodayDateInput() });

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  const params = { outletId, ...toIsoRange(range) };

  return (
    <div className="space-y-6">
      <ReportFilterBar range={range} onRangeChange={setRange} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportCard reportKey="customer-segmentation" params={params} />
        <ReportCard reportKey="loyalty-ledger" params={params} />
      </div>
    </div>
  );
}
