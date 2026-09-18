import { Role } from "@/store/authStore";

export function getHomeRoute(role: Role): string {
  return role === "KITCHEN" ? "/kds" : "/pos";
}
