import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useTransactions } from "@/api/transactions";
import { PaymentMethod, TransactionStatus } from "@/api/types";
import { Badge, Card, Select, Spinner } from "@/components/ui";
import { EyeIcon } from "@/components/icons";
import { money } from "@/features/pos/cartMath";
import { TransactionDetailModal } from "./TransactionDetailModal";
import { ReceiptViewModal } from "./ReceiptViewModal";

const statusColor: Record<string, "gray" | "green" | "red" | "yellow" | "blue"> = {
  HELD: "yellow",
  OPEN: "blue",
  COMPLETED: "green",
  VOIDED: "red",
  REFUNDED: "red",
};

export function TransactionsPage() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [status, setStatus] = useState<TransactionStatus | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [receiptViewId, setReceiptViewId] = useState<number | null>(null);

  const { data, isLoading } = useTransactions({
    outletId: outletId ?? undefined,
    status: status || undefined,
    paymentMethod: paymentMethod || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <div className="flex gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus | "")} className="w-40">
            <option value="">All statuses</option>
            <option value="HELD">Held</option>
            <option value="OPEN">Open</option>
            <option value="COMPLETED">Completed</option>
            <option value="VOIDED">Voided</option>
            <option value="REFUNDED">Refunded</option>
          </Select>
          <Select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | "")}
            className="w-40"
          >
            <option value="">All payment methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="EWALLET">E-Wallet</option>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Receipt #</th>
                <th className="px-4 py-2">Cashier</th>
                <th className="px-4 py-2">Table</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setReceiptViewId(null);
                    setSelectedId(t.id);
                  }}
                >
                  <td className="px-4 py-2">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">{t.receiptNumber ?? "-"}</td>
                  <td className="px-4 py-2">{t.cashier?.name}</td>
                  <td className="px-4 py-2">{t.table?.name ?? "-"}</td>
                  <td className="px-4 py-2">{t._count?.items ?? t.items?.length ?? "-"}</td>
                  <td className="px-4 py-2 font-medium">{money(Number(t.total))}</td>
                  <td className="px-4 py-2">
                    <Badge color={statusColor[t.status]}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setSelectedId(null);
                        setReceiptViewId(t.id);
                      }}
                      className="text-gray-400 hover:text-brand-600"
                      title="View receipt"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <TransactionDetailModal transactionId={selectedId} onClose={() => setSelectedId(null)} />
      <ReceiptViewModal transactionId={receiptViewId} onClose={() => setReceiptViewId(null)} />
    </div>
  );
}
