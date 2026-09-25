import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PosPage } from "@/features/pos/PosPage";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { KdsPage } from "@/features/kds/KdsPage";
import { AttendancePage } from "@/features/attendance/AttendancePage";
import { ShiftManagementPage } from "@/features/shiftManagement/ShiftManagementPage";
import { QrMenuPage } from "@/features/qrOrder/QrMenuPage";
import { CustomerDisplayPage } from "./features/customerDisplay/CustomerDisplayPage";
import { QrOrderStatusPage } from "@/features/qrOrder/QrOrderStatusPage";
import { EInvoiceVerifyPage } from "@/features/einvoice/EInvoiceVerifyPage";
import { ReservationBookingPage } from "@/features/reservations/ReservationBookingPage";
import { ReservationsPage } from "@/features/reservations/ReservationsPage";
import { DeliveryQueuePage } from "@/features/delivery/DeliveryQueuePage";
import { CrmPage } from "@/features/crm/CrmPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/order/:token" element={<QrMenuPage />} />
      <Route path="/order/:token/status" element={<QrOrderStatusPage />} />
      <Route path="/einvoice/:uuid/share/:longId" element={<EInvoiceVerifyPage />} />
      <Route path="/display/:token" element={<CustomerDisplayPage />} />
      <Route path="/reserve/:outletId" element={<ReservationBookingPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<ProtectedRoute roles={["ADMIN", "MANAGER", "CASHIER"]} />}>
            <Route path="/pos" element={<PosPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/delivery" element={<DeliveryQueuePage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN", "MANAGER", "CASHIER", "KITCHEN"]} />}>
            <Route path="/kds" element={<KdsPage />} />
            <Route path="/my-shift" element={<AttendancePage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN", "MANAGER"]} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/crm" element={<CrmPage />} />
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
