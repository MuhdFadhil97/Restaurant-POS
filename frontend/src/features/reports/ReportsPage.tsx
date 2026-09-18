import { useState } from "react";
import { Tabs } from "@/components/ui";
import { SalesReportsTab } from "./SalesReportsTab";
import { TopPerformersTab } from "./TopPerformersTab";
import { InventoryReportsTab } from "./InventoryReportsTab";
import { PurchasingReportsTab } from "./PurchasingReportsTab";
import { CashShiftReportsTab } from "./CashShiftReportsTab";
import { StaffAttendanceReportsTab } from "./StaffAttendanceReportsTab";
import { CustomersReportsTab } from "./CustomersReportsTab";
import { TaxComplianceReportsTab } from "./TaxComplianceReportsTab";
import { AuditReportsTab } from "./AuditReportsTab";

const tabs = [
  { key: "sales", label: "Sales", component: SalesReportsTab },
  { key: "top", label: "Top Performers", component: TopPerformersTab },
  { key: "inventory", label: "Inventory", component: InventoryReportsTab },
  { key: "purchasing", label: "Purchasing", component: PurchasingReportsTab },
  { key: "cash", label: "Cash & Shift", component: CashShiftReportsTab },
  { key: "attendance", label: "Staff & Attendance", component: StaffAttendanceReportsTab },
  { key: "customers", label: "Customers", component: CustomersReportsTab },
  { key: "tax", label: "Tax & Compliance", component: TaxComplianceReportsTab },
  { key: "audit", label: "Audit", component: AuditReportsTab },
] as const;

export function ReportsPage() {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("sales");
  const ActiveComponent = tabs.find((t) => t.key === active)!.component;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      <ActiveComponent />
    </div>
  );
}
