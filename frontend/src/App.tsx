import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
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
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/order/:token" element={<QrMenuPage />} />
      <Route path="/order/:token/status" element={<QrOrderStatusPage />} />
      <Route path="/einvoice/:uuid/share/:longId" element={<EInvoiceVerifyPage />} />
      <Route path="/display/:token" element={<CustomerDisplayPage />} />
      <Route path="/reserve/:outletId" element={<ReservationBookingPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<ProtectedRoute modules={["pos"]} />}>
            <Route path="/pos" element={<PosPage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["transactions"]} />}>
            <Route path="/transactions" element={<TransactionsPage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["customers"]} />}>
            <Route path="/customers" element={<CustomersPage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["reservations"]} />}>
            <Route path="/reservations" element={<ReservationsPage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["delivery"]} />}>
            <Route path="/delivery" element={<DeliveryQueuePage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["kds"]} />}>
            <Route path="/kds" element={<KdsPage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["my-shift"]} />}>
            <Route path="/my-shift" element={<AttendancePage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["dashboard"]} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["products"]} />}>
            <Route path="/products" element={<ProductsPage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["inventory"]} />}>
            <Route path="/inventory" element={<InventoryPage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["reports"]} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["crm"]} />}>
            <Route path="/crm" element={<CrmPage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["shift-management"]} />}>
            <Route path="/shift-management" element={<ShiftManagementPage />} />
          </Route>
          <Route element={<ProtectedRoute modules={["settings"]} />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}
