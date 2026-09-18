import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRefundTransaction, useTransaction, useVoidTransaction } from "@/api/transactions";
import { getErrorMessage } from "@/api/client";
import { Badge, Button, Modal, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";
import { Receipt } from "./Receipt";
import { VoidRefundModal } from "./VoidRefundModal";

const statusColor: Record<string, "gray" | "green" | "red" | "yellow" | "blue"> = {
  HELD: "yellow",
  OPEN: "blue",
  COMPLETED: "green",
  VOIDED: "red",
  REFUNDED: "red",
};

export function TransactionDetailModal({
  transactionId,
  onClose,
}: {
  transactionId: number | null;
  onClose: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [action, setAction] = useState<"void" | "refund" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const voidMutation = useVoidTransaction();
  const refundMutation = useRefundTransaction();
  const { data: transaction, isLoading } = useTransaction(transactionId ?? undefined);

  if (!transactionId) return null;

  if (isLoading || !transaction) {
    return (
      <Modal open={!!transactionId} onClose={onClose} title="Transaction Detail">
        <Spinner />
      </Modal>
    );
  }

  const canVoid = transaction.status === "COMPLETED" && (user?.role === "MANAGER" || user?.role === "ADMIN" || user?.role === "CASHIER");
  const canRefund = transaction.status === "COMPLETED";

  async function handleConfirm(input: { reason: string; approverId?: number; approverPassword?: string }) {
    setError(null);
    try {
      if (action === "void") {
        await voidMutation.mutateAsync({ id: transaction!.id, ...input });
      } else if (action === "refund") {
        await refundMutation.mutateAsync({ id: transaction!.id, ...input });
      }
      setAction(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <Modal open={!!transactionId} onClose={onClose} title="Transaction Detail">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{new Date(transaction.createdAt).toLocaleString()}</p>
              {transaction.receiptNumber && <p className="text-xs text-gray-400">Receipt: {transaction.receiptNumber}</p>}
              <p className="text-xs text-gray-400">Cashier: {transaction.cashier?.name}</p>
            </div>
            <Badge color={statusColor[transaction.status]}>{transaction.status}</Badge>
          </div>

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
            {transaction.items.map((item) => (
              <div key={item.id} className="flex justify-between px-3 py-2 text-sm">
                <span>
                  {item.quantity}x {item.product.name}
                  {item.variant ? ` (${item.variant.value})` : ""}
                </span>
                <span>{money(Number(item.lineTotal))}</span>
              </div>
            ))}
          </div>

          <div className="text-sm space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{money(Number(transaction.subtotal))}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>-{money(Number(transaction.discountTotal))}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{money(Number(transaction.taxTotal))}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-gray-200">
              <span>Total</span>
              <span>{money(Number(transaction.total))}</span>
            </div>
          </div>

          {transaction.payments.length > 0 && (
            <div className="text-sm">
              <p className="font-medium mb-1">Payments</p>
              {transaction.payments.map((p) => (
                <div key={p.id} className="flex justify-between text-gray-600">
                  <span>
                    {p.method}
                    {p.remark && <span className="text-xs text-gray-400"> — {p.remark}</span>}
                  </span>
                  <span>{money(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          )}

          {transaction.voidReason && (
            <p className="text-xs text-red-500">
              {transaction.status === "REFUNDED" ? "Refund" : "Void"} reason: {transaction.voidReason}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={handlePrint}>
              Print Receipt
            </Button>
            {canVoid && transaction.status === "COMPLETED" && (
              <Button variant="danger" onClick={() => setAction("void")}>
                Void
              </Button>
            )}
            {canRefund && (
              <Button variant="danger" onClick={() => setAction("refund")}>
                Refund
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <VoidRefundModal
        open={!!action}
        onClose={() => setAction(null)}
        mode={action ?? "void"}
        onConfirm={handleConfirm}
        busy={voidMutation.isPending || refundMutation.isPending}
        error={error}
      />

      <div className="hidden print:block">
        <Receipt transaction={transaction} />
      </div>
    </>
  );
}
