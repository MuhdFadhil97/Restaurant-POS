import { useMemo, useState } from "react";
import { OutletsTab } from "./OutletsTab";
import { UsersTab } from "./UsersTab";
import { TaxRatesTab } from "./TaxRatesTab";
import { TablesTab } from "./TablesTab";
import { FloorPlanTab } from "./FloorPlanTab";
import { CategoriesTab } from "./CategoriesTab";
import { DiscountsTab } from "./DiscountsTab";
import { GiftCardsTab } from "./GiftCardsTab";
import { KitchenStationsTab } from "./KitchenStationsTab";
import { AuditLogTab } from "./AuditLogTab";
import { HardwareTab } from "../hardware/HardwareTab";
import { DeliveryTab } from "../delivery/DeliveryTab";
import { useAuthStore } from "@/store/authStore";

// `adminOnly` tabs touch credentials or privilege escalation (creating other
// users, viewing the tamper-evident audit trail, delivery platform API
// keys), so the backend keeps them ADMIN-gated regardless of module access —
// ticking the module alone can't grant them. Keep this list in sync with the
// route files that still stack requireRole("ADMIN") with requireModule
// (users/routes.ts, auditLogs/routes.ts, deliveryPlatforms/routes.ts).
const tabs = [
  { key: "outlets", moduleKey: "settings.outlets", label: "Outlets & Receipt", component: OutletsTab },
  { key: "users", moduleKey: "settings.users", label: "Users", component: UsersTab, adminOnly: true },
  { key: "tax", moduleKey: "settings.taxRates", label: "Tax Rates", component: TaxRatesTab },
  { key: "tables", moduleKey: "settings.tables", label: "Tables", component: TablesTab },
  { key: "floor-plan", moduleKey: "settings.floorPlan", label: "Floor Plan", component: FloorPlanTab },
  { key: "kitchen-stations", moduleKey: "settings.kitchenStations", label: "Kitchen Stations", component: KitchenStationsTab },
  { key: "hardware", moduleKey: "settings.hardware", label: "Hardware", component: HardwareTab },
  { key: "delivery", moduleKey: "settings.delivery", label: "Delivery", component: DeliveryTab, adminOnly: true },
  { key: "categories", moduleKey: "settings.categories", label: "Categories", component: CategoriesTab },
  { key: "discounts", moduleKey: "settings.discounts", label: "Discounts & Promotions", component: DiscountsTab },
  { key: "gift-cards", moduleKey: "settings.giftCards", label: "Gift Cards", component: GiftCardsTab },
  { key: "audit-log", moduleKey: "settings.auditLog", label: "Audit Log", component: AuditLogTab, adminOnly: true },
] as const;

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const userModules = user?.modules ?? [];
  const visibleTabs = useMemo(
    () =>
      tabs.filter(
        (t) => userModules.includes(t.moduleKey) && (!("adminOnly" in t) || user?.role === "ADMIN")
      ),
    [userModules, user?.role]
  );

  const [active, setActive] = useState<(typeof tabs)[number]["key"] | null>(null);
  const activeTab = visibleTabs.find((t) => t.key === active) ?? visibleTabs[0];

  if (!activeTab) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">You don't have access to any settings sections.</p>
      </div>
    );
  }

  const ActiveComponent = activeTab.component;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              activeTab.key === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500"
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
