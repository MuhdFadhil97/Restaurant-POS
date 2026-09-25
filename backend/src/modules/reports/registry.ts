import { ZodTypeAny } from "zod";
import { ApiError } from "../../lib/apiError";
import { ReportData } from "./types";
import {
  auditLogQuerySchema,
  discountUsageQuerySchema,
  einvoiceStatusQuerySchema,
  movementQuerySchema,
  outletOnlyQuerySchema,
  reportQuerySchema,
  salesByCategoryQuerySchema,
  stockTransferQuerySchema,
  taxCollectedQuerySchema,
  voidsRefundsQuerySchema,
} from "./validation";
import * as reportsService from "./service";
import { lowStockReport, movementsLedgerReport, stockOnHandReport, wastageReport } from "../inventory/reportQueries";
import { stockTakeVarianceReport } from "../stockTakes/reportQueries";
import { poSummaryReport } from "../purchaseOrders/reportQueries";
import { receivingDiscrepanciesReport } from "../goodsReceivedNotes/reportQueries";
import { supplierPerformanceReport } from "../suppliers/reportQueries";
import { transferRegisterReport } from "../stockTransfers/reportQueries";
import { cashReconciliationReport, cashVarianceSummaryReport } from "../cashSessions/reportQueries";
import {
  attendanceComplianceReport,
  complianceExceptionsReport,
  staffOvertimeReport,
} from "../staffAttendance/reportQueries";
import { customerSegmentationReport, loyaltyLedgerReport } from "../customers/reportQueries";
import {
  deliveryFulfillmentTimeReport,
  deliveryOrdersReport,
  deliveryPlatformPerformanceReport,
  deliveryRejectionsReport,
} from "../deliveryOrders/reportQueries";

export interface ReportDefinition {
  category: string;
  fetch: (query: any) => Promise<ReportData>;
  querySchema: ZodTypeAny;
}

// Single source of truth mapping a reportKey to how it's fetched and
// validated. Both the JSON endpoint (on-screen tables) and the export
// endpoint (Excel/PDF) resolve through this — adding a report never touches
// controller.ts/routes.ts/the exporters.
export const reportRegistry: Record<string, ReportDefinition> = {
  // Sales
  "sales-summary": { category: "sales", fetch: reportsService.salesSummaryReport, querySchema: reportQuerySchema },
  "top-products": { category: "sales", fetch: reportsService.topProductsReport, querySchema: reportQuerySchema },
  "sales-by-cashier": { category: "sales", fetch: reportsService.salesByCashierReport, querySchema: reportQuerySchema },
  "sales-by-payment-method": {
    category: "sales",
    fetch: reportsService.salesByPaymentMethodReport,
    querySchema: reportQuerySchema,
  },
  "sales-by-category": {
    category: "sales",
    fetch: reportsService.salesByCategoryReport,
    querySchema: salesByCategoryQuerySchema,
  },
  "voids-refunds": { category: "sales", fetch: reportsService.voidsRefundsReport, querySchema: voidsRefundsQuerySchema },
  "discount-usage": {
    category: "sales",
    fetch: reportsService.discountUsageReport,
    querySchema: discountUsageQuerySchema,
  },

  // Top Performers
  "top-categories": { category: "top", fetch: reportsService.topCategoriesReport, querySchema: reportQuerySchema },
  "top-cashiers": { category: "top", fetch: reportsService.topCashiersReport, querySchema: reportQuerySchema },
  "top-customers": { category: "top", fetch: reportsService.topCustomersReport, querySchema: reportQuerySchema },
  "slowest-products": { category: "top", fetch: reportsService.slowestProductsReport, querySchema: reportQuerySchema },

  // Inventory
  "stock-on-hand": { category: "inventory", fetch: stockOnHandReport, querySchema: outletOnlyQuerySchema },
  "low-stock": { category: "inventory", fetch: lowStockReport, querySchema: outletOnlyQuerySchema },
  "inventory-movements": { category: "inventory", fetch: movementsLedgerReport, querySchema: movementQuerySchema },
  wastage: { category: "inventory", fetch: wastageReport, querySchema: reportQuerySchema },
  "stock-take-variance": { category: "inventory", fetch: stockTakeVarianceReport, querySchema: reportQuerySchema },

  // Purchasing
  "po-summary": { category: "purchasing", fetch: poSummaryReport, querySchema: reportQuerySchema },
  "receiving-discrepancies": {
    category: "purchasing",
    fetch: receivingDiscrepanciesReport,
    querySchema: reportQuerySchema,
  },
  "supplier-performance": { category: "purchasing", fetch: supplierPerformanceReport, querySchema: reportQuerySchema },
  "stock-transfers": { category: "purchasing", fetch: transferRegisterReport, querySchema: stockTransferQuerySchema },

  // Cash & Shift
  "cash-reconciliation": { category: "cash", fetch: cashReconciliationReport, querySchema: reportQuerySchema },
  "cash-variance": { category: "cash", fetch: cashVarianceSummaryReport, querySchema: reportQuerySchema },

  // Staff & Attendance
  "staff-attendance": { category: "attendance", fetch: attendanceComplianceReport, querySchema: reportQuerySchema },
  "staff-overtime": { category: "attendance", fetch: staffOvertimeReport, querySchema: reportQuerySchema },
  "compliance-exceptions": {
    category: "attendance",
    fetch: complianceExceptionsReport,
    querySchema: reportQuerySchema,
  },

  // Customers / CRM
  "customer-segmentation": { category: "customers", fetch: customerSegmentationReport, querySchema: reportQuerySchema },
  "loyalty-ledger": { category: "customers", fetch: loyaltyLedgerReport, querySchema: reportQuerySchema },

  // Tax & Compliance
  "tax-collected": { category: "tax", fetch: reportsService.taxCollectedReport, querySchema: taxCollectedQuerySchema },
  "einvoice-status": {
    category: "tax",
    fetch: reportsService.einvoiceStatusReport,
    querySchema: einvoiceStatusQuerySchema,
  },

  // Audit
  "audit-log": { category: "audit", fetch: reportsService.auditLogReport, querySchema: auditLogQuerySchema },

  // Delivery / Online-Ordering
  "delivery-orders": { category: "delivery", fetch: deliveryOrdersReport, querySchema: reportQuerySchema },
  "delivery-platform-performance": {
    category: "delivery",
    fetch: deliveryPlatformPerformanceReport,
    querySchema: reportQuerySchema,
  },
  "delivery-rejections": { category: "delivery", fetch: deliveryRejectionsReport, querySchema: reportQuerySchema },
  "delivery-fulfillment-time": {
    category: "delivery",
    fetch: deliveryFulfillmentTimeReport,
    querySchema: reportQuerySchema,
  },
};

export function getReportDefinition(reportKey: string): ReportDefinition {
  const def = reportRegistry[reportKey];
  if (!def) {
    throw ApiError.notFound(`Unknown report: ${reportKey}`);
  }
  return def;
}
