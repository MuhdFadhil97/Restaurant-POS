import type { ComponentType, SVGProps } from "react";
import {
  BoxIcon,
  CalendarIcon,
  CartIcon,
  ChartBarIcon,
  ChefHatIcon,
  ClockIcon,
  CogIcon,
  DashboardIcon,
  MegaphoneIcon,
  ReceiptIcon,
  TruckIcon,
  UsersIcon,
  WarehouseIcon,
} from "@/components/icons";
import type { Role } from "@/store/authStore";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export interface ModuleDef {
  key: string;
  label: string;
  group: "main" | "settings";
  path?: string;
  icon?: IconType;
  defaultRoles: Role[];
  // Stays ADMIN-gated on the backend regardless of this tick (credentials /
  // privilege-escalation risk) — see SettingsPage.tsx's `adminOnly` tabs.
  adminOnly?: boolean;
}

// Single source of truth for "modules" a user's access can be ticked/unticked
// for. Keys must match backend/src/lib/modules.ts MODULE_KEYS exactly.
export const MODULE_REGISTRY: ModuleDef[] = [
  { key: "dashboard", label: "Dashboard", group: "main", path: "/dashboard", icon: DashboardIcon, defaultRoles: ["ADMIN", "MANAGER"] },
  { key: "pos", label: "POS", group: "main", path: "/pos", icon: CartIcon, defaultRoles: ["ADMIN", "MANAGER", "CASHIER"] },
  { key: "transactions", label: "Transactions", group: "main", path: "/transactions", icon: ReceiptIcon, defaultRoles: ["ADMIN", "MANAGER", "CASHIER"] },
  { key: "reservations", label: "Reservations", group: "main", path: "/reservations", icon: CalendarIcon, defaultRoles: ["ADMIN", "MANAGER", "CASHIER"] },
  { key: "delivery", label: "Delivery", group: "main", path: "/delivery", icon: TruckIcon, defaultRoles: ["ADMIN", "MANAGER", "CASHIER"] },
  { key: "kds", label: "Kitchen", group: "main", path: "/kds", icon: ChefHatIcon, defaultRoles: ["ADMIN", "MANAGER", "CASHIER", "KITCHEN"] },
  { key: "products", label: "Products", group: "main", path: "/products", icon: BoxIcon, defaultRoles: ["ADMIN", "MANAGER"] },
  { key: "inventory", label: "Inventory", group: "main", path: "/inventory", icon: WarehouseIcon, defaultRoles: ["ADMIN", "MANAGER"] },
  { key: "customers", label: "Customers", group: "main", path: "/customers", icon: UsersIcon, defaultRoles: ["ADMIN", "MANAGER", "CASHIER"] },
  { key: "crm", label: "Marketing", group: "main", path: "/crm", icon: MegaphoneIcon, defaultRoles: ["ADMIN", "MANAGER"] },
  { key: "reports", label: "Reports", group: "main", path: "/reports", icon: ChartBarIcon, defaultRoles: ["ADMIN", "MANAGER"] },
  { key: "my-shift", label: "My Shift", group: "main", path: "/my-shift", icon: ClockIcon, defaultRoles: ["ADMIN", "MANAGER", "CASHIER", "KITCHEN"] },
  { key: "shift-management", label: "Shift Management", group: "main", path: "/shift-management", icon: CalendarIcon, defaultRoles: ["ADMIN", "MANAGER"] },
  { key: "settings", label: "Settings", group: "main", path: "/settings", icon: CogIcon, defaultRoles: ["ADMIN"] },

  { key: "settings.outlets", label: "Outlets & Receipt", group: "settings", defaultRoles: ["ADMIN"] },
  { key: "settings.users", label: "Users", group: "settings", defaultRoles: ["ADMIN"], adminOnly: true },
  { key: "settings.taxRates", label: "Tax Rates", group: "settings", defaultRoles: ["ADMIN"] },
  { key: "settings.tables", label: "Tables", group: "settings", defaultRoles: ["ADMIN"] },
  { key: "settings.floorPlan", label: "Floor Plan", group: "settings", defaultRoles: ["ADMIN"] },
  { key: "settings.kitchenStations", label: "Kitchen Stations", group: "settings", defaultRoles: ["ADMIN"] },
  { key: "settings.hardware", label: "Hardware", group: "settings", defaultRoles: ["ADMIN"] },
  { key: "settings.delivery", label: "Delivery", group: "settings", defaultRoles: ["ADMIN"], adminOnly: true },
  { key: "settings.categories", label: "Categories", group: "settings", defaultRoles: ["ADMIN"] },
  { key: "settings.discounts", label: "Discounts & Promotions", group: "settings", defaultRoles: ["ADMIN"] },
  { key: "settings.giftCards", label: "Gift Cards", group: "settings", defaultRoles: ["ADMIN"] },
  { key: "settings.auditLog", label: "Audit Log", group: "settings", defaultRoles: ["ADMIN"], adminOnly: true },
];

export const MAIN_MODULES = MODULE_REGISTRY.filter((m) => m.group === "main");
export const SETTINGS_MODULES = MODULE_REGISTRY.filter((m) => m.group === "settings");

export function getDefaultModulesForRole(role: Role): string[] {
  return MODULE_REGISTRY.filter((m) => m.defaultRoles.includes(role)).map((m) => m.key);
}
