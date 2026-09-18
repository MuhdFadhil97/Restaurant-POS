import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { AttendanceReportTab } from "@/features/shiftManagement/AttendanceReportTab";
import { ReportCard } from "./components/ReportCard";
import { ReportFilterBar, startOfTodayDateInput, toIsoRange } from "./components/ReportFilterBar";

export function StaffAttendanceReportsTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [range, setRange] = useState({ from: startOfTodayDateInput(), to: startOfTodayDateInput() });

  return (
    <div className="space-y-8">
      <AttendanceReportTab />

      {outletId && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h2 className="font-semibold">Overtime & Compliance Exports</h2>
          <ReportFilterBar range={range} onRangeChange={setRange} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReportCard reportKey="staff-overtime" params={{ outletId, ...toIsoRange(range) }} />
            <ReportCard reportKey="compliance-exceptions" params={{ outletId, ...toIsoRange(range) }} />
          </div>
        </div>
      )}
    </div>
  );
}
