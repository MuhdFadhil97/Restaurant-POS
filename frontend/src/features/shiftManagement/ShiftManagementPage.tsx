import { useState } from "react";
import { ShiftTemplatesTab } from "./ShiftTemplatesTab";
import { MonthlyScheduleTab } from "./MonthlyScheduleTab";
import { AttendanceReportTab } from "./AttendanceReportTab";

const tabs = [
  { key: "templates", label: "Shift Templates", component: ShiftTemplatesTab },
  { key: "schedule", label: "Monthly Schedule", component: MonthlyScheduleTab },
  { key: "attendance", label: "Attendance & Compliance", component: AttendanceReportTab },
] as const;

export function ShiftManagementPage() {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("templates");
  const ActiveComponent = tabs.find((t) => t.key === active)!.component;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Shift Management</h1>
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              active === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  );
}
