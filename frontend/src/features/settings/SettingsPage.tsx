import { useState } from "react";
import { OutletsTab } from "./OutletsTab";
import { UsersTab } from "./UsersTab";
import { TaxRatesTab } from "./TaxRatesTab";
import { TablesTab } from "./TablesTab";
import { FloorPlanTab } from "./FloorPlanTab";
import { CategoriesTab } from "./CategoriesTab";
import { DiscountsTab } from "./DiscountsTab";
import { GiftCardsTab } from "./GiftCardsTab";
import { SuppliersTab } from "./SuppliersTab";
import { PurchaseOrdersTab } from "./PurchaseOrdersTab";
import { StockTransfersTab } from "./StockTransfersTab";
import { KitchenStationsTab } from "./KitchenStationsTab";
import { AuditLogTab } from "./AuditLogTab";

const tabs = [
  { key: "outlets", label: "Outlets & Receipt", component: OutletsTab },
  { key: "users", label: "Users", component: UsersTab },
  { key: "tax", label: "Tax Rates", component: TaxRatesTab },
  { key: "tables", label: "Tables", component: TablesTab },
  { key: "floor-plan", label: "Floor Plan", component: FloorPlanTab },
  { key: "kitchen-stations", label: "Kitchen Stations", component: KitchenStationsTab },
  { key: "categories", label: "Categories", component: CategoriesTab },
  { key: "discounts", label: "Discounts & Promotions", component: DiscountsTab },
  { key: "gift-cards", label: "Gift Cards", component: GiftCardsTab },
  { key: "suppliers", label: "Suppliers", component: SuppliersTab },
  { key: "purchase-orders", label: "Purchase Orders", component: PurchaseOrdersTab },
  { key: "stock-transfers", label: "Stock Transfers", component: StockTransfersTab },
  { key: "audit-log", label: "Audit Log", component: AuditLogTab },
] as const;

export function SettingsPage() {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("outlets");
  const ActiveComponent = tabs.find((t) => t.key === active)!.component;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
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
