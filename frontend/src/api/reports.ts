import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import { PaymentMethod } from "./types";

export interface ReportParams {
  outletId?: number;
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
  serviceChargeTotal: number;
}

export interface TopProductRow {
  productId: number;
  name: string;
  sku: string;
  quantitySold: number;
  revenue: number;
}

export interface SalesByCashierRow {
  cashierId: number;
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

// ── Generic catalog-driven reports (Excel/PDF-exportable) ──────────────────

export interface ReportColumn {
  key: string;
  header: string;
  format?: "text" | "number" | "currency" | "date" | "datetime" | "percent";
  align?: "left" | "right" | "center";
}

export interface ReportMeta {
  outletName?: string;
  from?: string;
  to?: string;
  generatedAt: string;
  generatedBy?: string;
  filtersApplied?: Record<string, string | number | undefined>;
}

export interface ReportData<Row = Record<string, unknown>> {
  title: string;
  columns: ReportColumn[];
  rows: Row[];
  meta: ReportMeta;
  totals?: Record<string, number | string>;
}

export type ReportQueryParams = Record<string, string | number | boolean | undefined>;

export function useReport<Row = Record<string, unknown>>(
  reportKey: string,
  params: ReportQueryParams,
  enabled = true
) {
  return useQuery({
    queryKey: ["report", reportKey, params],
    queryFn: async () => (await apiClient.get<ReportData<Row>>(`/reports/${reportKey}`, { params })).data,
    enabled: enabled && !!params.outletId,
  });
}

export async function downloadReport(
  reportKey: string,
  format: "xlsx" | "pdf",
  params: ReportQueryParams
): Promise<void> {
  const res = await apiClient.get(`/reports/${reportKey}/export`, {
    params: { ...params, format },
    responseType: "blob",
  });

  const contentDisposition = res.headers["content-disposition"] as string | undefined;
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `${reportKey}.${format}`;

  const url = URL.createObjectURL(res.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
