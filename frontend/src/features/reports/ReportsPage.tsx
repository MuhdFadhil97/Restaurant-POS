import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useSalesByCashier, useSalesByPaymentMethod, useSalesSummary, useTopProducts } from "@/api/reports";
import { Card, Input, Select, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";
import { CashReconciliation } from "./CashReconciliation";

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function endOfTodayIso() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function ReportsPage() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [from, setFrom] = useState(startOfTodayIso().slice(0, 10));
  const [to, setTo] = useState(endOfTodayIso().slice(0, 10));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const params = {
    outletId: outletId ?? undefined,
    from: new Date(from + "T00:00:00").toISOString(),
    to: new Date(to + "T23:59:59").toISOString(),
  };

  const summary = useSalesSummary({ ...params, groupBy });
  const topProducts = useTopProducts({ ...params, limit: 10 });
  const byCashier = useSalesByCashier(params);
  const byPaymentMethod = useSalesByPaymentMethod(params);

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Reports</h1>
        <div className="flex gap-2 items-center">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-gray-400">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)} className="w-32">
            <option value="day">By day</option>
            <option value="week">By week</option>
            <option value="month">By month</option>
          </Select>
        </div>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Sales Summary</h2>
        {summary.isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left">
              <tr>
                <th className="py-1">Period</th>
                <th className="py-1">Orders</th>
                <th className="py-1">Gross Sales</th>
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
                  <td className="py-1">{money(row.taxTotal)}</td>
                  <td className="py-1">{money(row.discountTotal)}</td>
                </tr>
              ))}
              {summary.data?.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-400">
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
          <h2 className="font-semibold mb-3">Top Selling Products</h2>
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
          <h2 className="font-semibold mb-3">Sales by Cashier</h2>
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
          <h2 className="font-semibold mb-3">Sales by Payment Method</h2>
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

        <CashReconciliation outletId={outletId} />
      </div>
    </div>
  );
}
