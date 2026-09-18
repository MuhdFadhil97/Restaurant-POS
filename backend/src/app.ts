import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./modules/auth/routes";
import outletRoutes from "./modules/outlets/routes";
import userRoutes from "./modules/users/routes";
import categoryRoutes from "./modules/categories/routes";
import productRoutes from "./modules/products/routes";
import inventoryRoutes from "./modules/inventory/routes";
import tableRoutes from "./modules/tables/routes";
import customerRoutes from "./modules/customers/routes";
import discountRoutes from "./modules/discounts/routes";
import taxRateRoutes from "./modules/taxRates/routes";
import transactionRoutes from "./modules/transactions/routes";
import cashSessionRoutes from "./modules/cashSessions/routes";
import reportRoutes from "./modules/reports/routes";
import auditLogRoutes from "./modules/auditLogs/routes";
import kitchenStationRoutes from "./modules/kitchenStations/routes";
import kdsRoutes from "./modules/kds/routes";
import supplierRoutes from "./modules/suppliers/routes";
import purchaseOrderRoutes from "./modules/purchaseOrders/routes";
import stockTransferRoutes from "./modules/stockTransfers/routes";
import giftCardRoutes from "./modules/giftCards/routes";
import shiftTemplateRoutes from "./modules/shiftTemplates/routes";
import shiftScheduleRoutes from "./modules/shiftSchedules/routes";
import staffAttendanceRoutes from "./modules/staffAttendance/routes";

export const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/outlets", outletRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/tax-rates", taxRateRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/cash-sessions", cashSessionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/kitchen-stations", kitchenStationRoutes);
app.use("/api/kds", kdsRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/stock-transfers", stockTransferRoutes);
app.use("/api/gift-cards", giftCardRoutes);
app.use("/api/shift-templates", shiftTemplateRoutes);
app.use("/api/shift-schedules", shiftScheduleRoutes);
app.use("/api/staff-attendance", staffAttendanceRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
