import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { TransactionItemDto } from "@/api/types";
import { Button, ErrorMessage, Input, Modal } from "@/components/ui";
import { money } from "@/features/pos/cartMath";

export interface RefundLineSelection {
  transactionItemId: number;
  quantity: number;
}

export function VoidRefundModal({
  open,
  onClose,
  mode,
  items,
  onConfirm,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  mode: "void" | "refund";
  // Only relevant for "refund" — lets staff pick specific lines/quantities
  // instead of always refunding the entire remaining balance.
  items?: TransactionItemDto[];
  onConfirm: (input: {
    reason: string;
    approverUsername?: string;
    approverPassword?: string;
    items?: RefundLineSelection[];
  }) => void;
  busy: boolean;
  error: string | null;
}) {
  const user = useAuthStore((s) => s.user);
  const needsApproval = user?.role === "CASHIER";
  const [reason, setReason] = useState("");
  const [approverUsername, setApproverUsername] = useState("");
  const [approverPassword, setApproverPassword] = useState("");
  const [selected, setSelected] = useState<Record<number, number>>({});

  const refundableItems = (items ?? []).filter((i) => i.quantity - (i.refundedQuantity ?? 0) > 0);

  useEffect(() => {
    if (open && mode === "refund") {
      // Default to selecting everything still refundable — matches the old
      // one-click full-refund behavior; staff can uncheck/reduce from there.
      setSelected(Object.fromEntries(refundableItems.map((i) => [i.id, i.quantity - (i.refundedQuantity ?? 0)])));
    }
    if (open) {
      setReason("");
      setApproverUsername("");
      setApproverPassword("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  function toggleItem(itemId: number, max: number) {
    setSelected((prev) => {
      const next = { ...prev };
      if (itemId in next) delete next[itemId];
      else next[itemId] = max;
      return next;
    });
  }

  function setQuantity(itemId: number, quantity: number, max: number) {
    setSelected((prev) => ({ ...prev, [itemId]: Math.min(Math.max(1, quantity), max) }));
  }

  const isPartialRefund = mode === "refund" && items && items.length > 0;
  const noneSelected = isPartialRefund && Object.keys(selected).length === 0;

  return (
    <Modal open={open} onClose={onClose} title={mode === "void" ? "Void Transaction" : "Refund Transaction"}>
      <div className="space-y-3">
        {isPartialRefund && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Items to refund</p>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
              {refundableItems.map((item) => {
                const max = item.quantity - (item.refundedQuantity ?? 0);
                const checked = item.id in selected;
                return (
                  <label key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={checked} onChange={() => toggleItem(item.id, max)} />
                      {item.product.name}
                      {item.variant ? ` (${item.variant.value})` : ""}
                      {(item.refundedQuantity ?? 0) > 0 && (
                        <span className="text-xs text-gray-400">({max} of {item.quantity} left)</span>
                      )}
                    </span>
                    {checked && (
                      <span className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={max}
                          value={selected[item.id]}
                          onChange={(e) => setQuantity(item.id, Number(e.target.value), max)}
                          className="w-14 rounded border border-gray-300 px-1 py-0.5 text-right"
                        />
                        <span className="text-gray-400 w-16 text-right">
                          {money((Number(item.lineTotal) / item.quantity) * selected[item.id])}
                        </span>
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>

        {needsApproval && (
          <>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Manager or admin approval is required. Ask them to enter their username and password.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approver Username</label>
              <Input value={approverUsername} onChange={(e) => setApproverUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approver Password</label>
              <Input type="password" value={approverPassword} onChange={(e) => setApproverPassword(e.target.value)} />
            </div>
          </>
        )}

        {error && <ErrorMessage message={error} />}

        <Button
          variant="danger"
          className="w-full"
          disabled={!reason || busy || noneSelected}
          onClick={() =>
            onConfirm({
              reason,
              approverUsername: approverUsername || undefined,
              approverPassword: approverPassword || undefined,
              items: isPartialRefund
                ? Object.entries(selected).map(([transactionItemId, quantity]) => ({
                    transactionItemId: Number(transactionItemId),
                    quantity,
                  }))
                : undefined,
            })
          }
        >
          {busy ? "Processing..." : mode === "void" ? "Void Transaction" : "Refund Transaction"}
        </Button>
      </div>
    </Modal>
  );
}
