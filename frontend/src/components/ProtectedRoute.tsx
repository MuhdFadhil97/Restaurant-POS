import { Navigate, Outlet } from "react-router-dom";
import { Role, useAuthStore } from "@/store/authStore";
import { getHomeRoute } from "@/lib/roleHome";

export function ProtectedRoute({ roles, modules }: { roles?: Role[]; modules?: string[] }) {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const userModules = user.modules ?? [];

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getHomeRoute(user.role, userModules)} replace />;
  }

  if (modules && !modules.some((m) => userModules.includes(m))) {
    return <Navigate to={getHomeRoute(user.role, userModules)} replace />;
  }

  return <Outlet />;
}
