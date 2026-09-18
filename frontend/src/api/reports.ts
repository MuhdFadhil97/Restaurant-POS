import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import { PaymentMethod } from "./types";

export interface ReportParams {
  outletId?: string;
  from: string;
  to: string;
  groupBy?: "day" | "week" | "month";
  limit?: number;
}

export interface SalesSummaryRow {
  period: string;
  orderCount: number;
  grossSales: number;
  taxTotal: number;
  discountTotal: number;
}

export interface TopProductRow {
  productId: string;
  name: string;
  sku: string;
  quantitySold: number;
  revenue: number;
}

export interface SalesByCashierRow {
  cashierId: string;
  cashierName: string;
  orderCount: number;
  totalSales: number;
}

export interface SalesByPaymentMethodRow {
  method: PaymentMethod;
  paymentCount: number;
  totalAmount: number;
}

export function useSalesSummary(params: ReportParams) {
  return useQuery({
    queryKey: ["report-sales-summary", params],
    queryFn: async () => (await apiClient.get<SalesSummaryRow[]>("/reports/sales-summary", { params })).data,
    enabled: !!params.outletId,
  });
}

export function useTopProducts(params: ReportParams) {
  return useQuery({
    queryKey: ["report-top-products", params],
    queryFn: async () => (await apiClient.get<TopProductRow[]>("/reports/top-products", { params })).data,
    enabled: !!params.outletId,
  });
}

export function useSalesByCashier(params: ReportParams) {
  return useQuery({
    queryKey: ["report-sales-by-cashier", params],
    queryFn: async () => (await apiClient.get<SalesByCashierRow[]>("/reports/sales-by-cashier", { params })).data,
    enabled: !!params.outletId,
  });
}

export function useSalesByPaymentMethod(params: ReportParams) {
  return useQuery({
    queryKey: ["report-sales-by-payment-method", params],
    queryFn: async () =>
      (await apiClient.get<SalesByPaymentMethodRow[]>("/reports/sales-by-payment-method", { params })).data,
    enabled: !!params.outletId,
  });
}
