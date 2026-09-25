import { Role } from "@/store/authStore";
import { MAIN_MODULES } from "@/config/modules";

function defaultForRole(role: Role): string {
  if (role === "KITCHEN") return "/kds";
  if (role === "ADMIN" || role === "MANAGER") return "/dashboard";
  return "/pos";
}

// Picks the role's usual landing page, but falls back to the first module the
// user actually has access to — otherwise a user whose access was
// customized to exclude their role's default landing page would bounce in a
// redirect loop (blocked route -> home route -> blocked -> ...).
export function getHomeRoute(role: Role, modules?: string[]): string {
  const preferred = defaultForRole(role);
  if (!modules || modules.length === 0) return preferred;

  const preferredModule = MAIN_MODULES.find((m) => m.path === preferred);
  if (preferredModule && modules.includes(preferredModule.key)) {
    return preferred;
  }

  const firstAccessible = MAIN_MODULES.find((m) => m.path && m.path !== "/settings" && modules.includes(m.key));
  return firstAccessible?.path ?? "/login";
}
