import { Role } from "@prisma/client";

// Canonical registry of app "modules" that can be granted/revoked per user.
// Mirrors the nav items in frontend/src/config/modules.ts — keep both in sync.
export const MODULE_KEYS = [
  "dashboard",
  "pos",
  "transactions",
  "reservations",
  "delivery",
  "kds",
  "products",
  "inventory",
  "customers",
  "crm",
  "reports",
  "my-shift",
  "shift-management",
  "settings",
  "settings.outlets",
  "settings.users",
  "settings.taxRates",
  "settings.tables",
  "settings.floorPlan",
  "settings.kitchenStations",
  "settings.hardware",
  "settings.delivery",
  "settings.categories",
  "settings.discounts",
  "settings.giftCards",
  "settings.auditLog",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

const ALL_ROLES: Role[] = ["ADMIN", "MANAGER", "CASHIER", "KITCHEN", "SYSTEM"];
const ADMIN_ONLY: Role[] = ["ADMIN"];

// Defaults mirror the current hardcoded role arrays in App.tsx / AppLayout.tsx.
export const MODULE_DEFAULT_ROLES: Record<ModuleKey, Role[]> = {
  dashboard: ["ADMIN", "MANAGER"],
  pos: ["ADMIN", "MANAGER", "CASHIER"],
  transactions: ["ADMIN", "MANAGER", "CASHIER"],
  reservations: ["ADMIN", "MANAGER", "CASHIER"],
  delivery: ["ADMIN", "MANAGER", "CASHIER"],
  kds: ["ADMIN", "MANAGER", "CASHIER", "KITCHEN"],
  products: ["ADMIN", "MANAGER"],
  inventory: ["ADMIN", "MANAGER"],
  customers: ["ADMIN", "MANAGER", "CASHIER"],
  crm: ["ADMIN", "MANAGER"],
  reports: ["ADMIN", "MANAGER"],
  "my-shift": ["ADMIN", "MANAGER", "CASHIER", "KITCHEN"],
  "shift-management": ["ADMIN", "MANAGER"],
  settings: ADMIN_ONLY,
  "settings.outlets": ADMIN_ONLY,
  "settings.users": ADMIN_ONLY,
  "settings.taxRates": ADMIN_ONLY,
  "settings.tables": ADMIN_ONLY,
  "settings.floorPlan": ADMIN_ONLY,
  "settings.kitchenStations": ADMIN_ONLY,
  "settings.hardware": ADMIN_ONLY,
  "settings.delivery": ADMIN_ONLY,
  "settings.categories": ADMIN_ONLY,
  "settings.discounts": ADMIN_ONLY,
  "settings.giftCards": ADMIN_ONLY,
  "settings.auditLog": ADMIN_ONLY,
};

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

export function getDefaultModulesForRole(role: Role): ModuleKey[] {
  return MODULE_KEYS.filter((key) => MODULE_DEFAULT_ROLES[key].includes(role));
}

// Returns a user's effective module access: their explicit overrides if
// `customized` is set (which allows an admin to deliberately grant zero
// modules), otherwise their role's defaults.
export function getEffectiveModules(
  role: Role,
  customized: boolean,
  overrides: string[]
): ModuleKey[] {
  if (customized) {
    return overrides.filter(isModuleKey);
  }
  return getDefaultModulesForRole(role);
}
