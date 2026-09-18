import { Navigate, Outlet } from "react-router-dom";
import { Role, useAuthStore } from "@/store/authStore";
import { getHomeRoute } from "@/lib/roleHome";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  return <Outlet />;
}
