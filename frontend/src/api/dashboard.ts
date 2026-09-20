import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import { PaymentMethod } from "./types";

export interface DashboardSalesWindow {
  grossSales: number;
  orderCount: number;
  avgTicket: number | null;
}

export interface DashboardTopProduct {
  productId: number;
  name: string;
  sku: string;
  quantitySold: number;
  revenue: number;
}

export interface DashboardPaymentMix {
  method: PaymentMethod;
  paymentCount: number;
  totalAmount: number;
}

export interface DashboardLowStockItem {
  productId: number;
  name: string;
  sku: string;
  quantityOnHand: number;
  lowStockThreshold: number;
}

export interface DashboardCashSession {
  id: number;
  userId: number;
  userName: string;
  openingCash: number;
  expectedCash: number;
  openedAt: string;
}

export interface DashboardStaffOnDuty {
  attendanceId: number;
  userId: number;
  userName: string;
  role: string;
  status: "CLOCKED_IN" | "ON_BREAK";
  clockInAt: string;
}

export interface DashboardSummary {
  sales: {
    today: DashboardSalesWindow;
    yesterday: DashboardSalesWindow;
    grossSalesDeltaPct: number | null;
    orderCountDeltaPct: number | null;
  };
  topProducts: DashboardTopProduct[];
  paymentMix: DashboardPaymentMix[];
  lowStock: DashboardLowStockItem[];
  cashSessions: DashboardCashSession[];
  staffOnDuty: DashboardStaffOnDuty[];
}

export function useDashboardSummary(outletId: number | null) {
  return useQuery({
    queryKey: ["dashboard-summary", outletId],
    queryFn: async () =>
      (await apiClient.get<DashboardSummary>("/dashboard/summary", { params: { outletId } })).data,
    enabled: !!outletId,
    refetchInterval: 60_000,
  });
}
