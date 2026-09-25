import { NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useOutletStore } from "@/store/outletStore";
import { useUiStore } from "@/store/uiStore";
import { useOutlets } from "@/api/outlets";
import { Select } from "@/components/ui";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { LicenseBanner } from "@/components/LicenseBanner";
import { ChevronLeftIcon, ChevronRightIcon, LogoutIcon } from "@/components/icons";
import { MAIN_MODULES } from "@/config/modules";

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const { activeOutletId, setActiveOutlet } = useOutletStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { data: outlets } = useOutlets();

  useEffect(() => {
    if (!activeOutletId && outlets && outlets.length > 0) {
      setActiveOutlet(outlets[0].id);
    }
  }, [outlets, activeOutletId, setActiveOutlet]);

  if (!user) return null;

  const userModules = user.modules ?? [];
  const visibleNav = MAIN_MODULES.filter((item) => item.path && userModules.includes(item.key));

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <LicenseBanner />
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`${sidebarCollapsed ? "w-16" : "w-56"} shrink-0 bg-gray-900 text-gray-200 flex flex-col transition-all duration-200`}
        >
          <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-gray-800">
            {!sidebarCollapsed && <span className="text-xl font-bold text-white">POS</span>}
            <button
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 shrink-0"
            >
              {sidebarCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
            {visibleNav.map((item) => (
              <NavLink
                key={item.key}
                to={item.path!}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 text-sm font-medium ${
                    sidebarCollapsed ? "justify-center py-3" : "px-5 py-2.5"
                  } ${isActive ? "bg-brand-600 text-white" : "text-gray-300 hover:bg-gray-800"}`
                }
              >
                {item.icon && <item.icon className="w-5 h-5 shrink-0" />}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className={`border-t border-gray-800 text-sm ${sidebarCollapsed ? "p-2" : "p-4"}`}>
            {sidebarCollapsed ? (
              <button
                onClick={logout}
                title="Log out"
                className="w-full flex justify-center p-2 rounded text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <LogoutIcon className="w-5 h-5" />
              </button>
            ) : (
              <>
                <div className="font-medium text-white truncate">{user.name}</div>
                <div className="text-gray-400 text-xs mb-2">{user.role}</div>
                <button onClick={logout} className="text-gray-400 hover:text-white text-xs">
                  Log out
                </button>
              </>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div className="text-sm text-gray-500">Outlet</div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="w-64">
                {outlets && outlets.length > 0 ? (
                  <Select value={activeOutletId ?? ""} onChange={(e) => setActiveOutlet(Number(e.target.value))}>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <span className="text-sm text-gray-400">No outlets assigned</span>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
