import { useState } from "react";
import { SuppliersTab } from "./SuppliersTab";
import { PurchaseOrdersTab } from "./PurchaseOrdersTab";
import { StockTransfersTab } from "./StockTransfersTab";
import { StockAdjustmentTab } from "./StockAdjustmentTab";
import { MovementLogTab } from "./MovementLogTab";
import { LowStockTab } from "./LowStockTab";

const tabs = [
  { key: "suppliers", label: "Suppliers", component: SuppliersTab },
  { key: "purchase-orders", label: "Purchase Orders", component: PurchaseOrdersTab },
  { key: "stock-transfers", label: "Stock Transfers", component: StockTransfersTab },
  { key: "stock-adjustment", label: "Stock Adjustment", component: StockAdjustmentTab },
  { key: "movement-log", label: "Movement Log", component: MovementLogTab },
  { key: "low-stock", label: "Low Stock Alerts", component: LowStockTab },
] as const;

export function InventoryPage() {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("suppliers");
  const ActiveComponent = tabs.find((t) => t.key === active)!.component;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Inventory</h1>
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
