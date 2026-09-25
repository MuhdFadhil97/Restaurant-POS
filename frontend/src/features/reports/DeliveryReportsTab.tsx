import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { ReportCard } from "./components/ReportCard";
import { ReportFilterBar, startOfTodayDateInput, toIsoRange } from "./components/ReportFilterBar";

export function DeliveryReportsTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [range, setRange] = useState({ from: startOfTodayDateInput(), to: startOfTodayDateInput() });

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  const params = { outletId, ...toIsoRange(range) };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Every delivery order received in this range, including ones archived off the Delivery board — this is where
        an archived order can still be found.
      </p>
      <ReportFilterBar range={range} onRangeChange={setRange} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportCard reportKey="delivery-platform-performance" params={params} />
        <ReportCard reportKey="delivery-rejections" params={params} />
        <ReportCard reportKey="delivery-fulfillment-time" params={params} />
        <ReportCard reportKey="delivery-orders" params={params} />
      </div>
    </div>
  );
}
