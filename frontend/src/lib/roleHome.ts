import { Role } from "@/store/authStore";

export function getHomeRoute(role: Role): string {
  if (role === "KITCHEN") return "/kds";
  if (role === "ADMIN" || role === "MANAGER") return "/dashboard";
  return "/pos";
}
