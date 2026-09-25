import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useSalesByCashier, useSalesByPaymentMethod, useSalesSummary, useTopProducts } from "@/api/reports";
import { Card, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";
import { ExportButtons } from "./components/ExportButtons";
import { ReportCard } from "./components/ReportCard";
import { ReportFilterBar, startOfTodayDateInput, toIsoRange } from "./components/ReportFilterBar";

export function SalesReportsTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [range, setRange] = useState({ from: startOfTodayDateInput(), to: startOfTodayDateInput() });
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const isoRange = toIsoRange(range);
  // outletId can still be undefined on first render (outlet store hasn't
  // hydrated yet) — these hooks must run unconditionally every render (Rules
  // of Hooks), so a placeholder 0 stands in for `params.outletId` and each
  // hook's own `enabled: !!params.outletId` keeps it from actually fetching.
  const params = { outletId: outletId ?? 0, ...isoRange };

  const summary = useSalesSummary({ ...params, groupBy });
  const topProducts = useTopProducts({ ...params, limit: 10 });
  const byCashier = useSalesByCashier(params);
  const byPaymentMethod = useSalesByPaymentMethod(params);

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-6">
      <ReportFilterBar range={range} onRangeChange={setRange} groupBy={groupBy} onGroupByChange={setGroupBy} />

      <Card className="p-4">
        <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
          <h2 className="font-semibold">Sales Summary</h2>
          <ExportButtons reportKey="sales-summary" params={{ ...params, groupBy }} />
        </div>
        {summary.isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left">
              <tr>
                <th className="py-1">Period</th>
                <th className="py-1">Orders</th>
                <th className="py-1">Gross Sales</th>
                <th className="py-1">Service Charge</th>
                <th className="py-1">Tax</th>
                <th className="py-1">Discount</th>
              </tr>
            </thead>
            <tbody>
              {summary.data?.map((row) => (
                <tr key={row.period} className="border-t border-gray-100">
                  <td className="py-1">{new Date(row.period).toLocaleDateString()}</td>
                  <td className="py-1">{row.orderCount}</td>
                  <td className="py-1">{money(row.grossSales)}</td>
                  <td className="py-1">{money(row.serviceChargeTotal)}</td>
                  <td className="py-1">{money(row.taxTotal)}</td>
                  <td className="py-1">{money(row.discountTotal)}</td>
                </tr>
              ))}
              {summary.data?.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-400">
                    No sales in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
            <h2 className="font-semibold">Top Selling Products</h2>
            <ExportButtons reportKey="top-products" params={{ ...params, limit: 10 }} />
          </div>
          {topProducts.isLoading ? (
            <Spinner />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-left">
                <tr>
                  <th className="py-1">Product</th>
                  <th className="py-1">Quantity</th>
                  <th className="py-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.data?.map((p) => (
                  <tr key={p.productId} className="border-t border-gray-100">
                    <td className="py-1.5">{p.name}</td>
                    <td className="py-1.5">{p.quantitySold}</td>
                    <td className="py-1.5">{money(p.revenue)}</td>
                  </tr>
                ))}
                {topProducts.data?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-400">
                      No sales in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
            <h2 className="font-semibold">Sales by Cashier</h2>
            <ExportButtons reportKey="sales-by-cashier" params={params} />
          </div>
          {byCashier.isLoading ? (
            <Spinner />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-left">
                <tr>
                  <th className="py-1">Staff Name</th>
                  <th className="py-1">Total Order</th>
                  <th className="py-1">Total Price (RM)</th>
                </tr>
              </thead>
              <tbody>
                {byCashier.data?.map((c) => (
                  <tr key={c.cashierId} className="border-t border-gray-100">
                    <td className="py-1.5">{c.cashierName}</td>
                    <td className="py-1.5">{c.orderCount}</td>
                    <td className="py-1.5">{money(c.totalSales)}</td>
                  </tr>
                ))}
                {byCashier.data?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-400">
                      No sales in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
            <h2 className="font-semibold">Sales by Payment Method</h2>
            <ExportButtons reportKey="sales-by-payment-method" params={params} />
          </div>
          {byPaymentMethod.isLoading ? (
            <Spinner />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-left">
                <tr>
                  <th className="py-1">Payment Method</th>
                  <th className="py-1">Quantity</th>
                  <th className="py-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {byPaymentMethod.data?.map((p) => (
                  <tr key={p.method} className="border-t border-gray-100">
                    <td className="py-1.5">{p.method}</td>
                    <td className="py-1.5">{p.paymentCount}</td>
                    <td className="py-1.5">{money(p.totalAmount)}</td>
                  </tr>
                ))}
                {byPaymentMethod.data?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-400">
                      No sales in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>

        <ReportCard reportKey="sales-by-category" params={params} />
        <ReportCard reportKey="voids-refunds" params={params} />
        <ReportCard reportKey="discount-usage" params={params} />
      </div>
    </div>
  );
}
