import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { PosPage } from "@/features/pos/PosPage";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { KdsPage } from "@/features/kds/KdsPage";
import { AttendancePage } from "@/features/attendance/AttendancePage";
import { ShiftManagementPage } from "@/features/shiftManagement/ShiftManagementPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<ProtectedRoute roles={["ADMIN", "MANAGER", "CASHIER"]} />}>
            <Route path="/pos" element={<PosPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN", "MANAGER", "CASHIER", "KITCHEN"]} />}>
            <Route path="/kds" element={<KdsPage />} />
            <Route path="/my-shift" element={<AttendancePage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN", "MANAGER"]} />}>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/shift-management" element={<ShiftManagementPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}
