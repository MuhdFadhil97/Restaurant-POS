import { useEffect, useState } from "react";
import { Customer, Outlet, PaymentMethod } from "@/api/types";
import { lookupGiftCard } from "@/api/giftCards";
import { getErrorMessage } from "@/api/client";
import { Button, ErrorMessage, Input, Modal, Select } from "@/components/ui";
import { money, round2 } from "./cartMath";

export interface PendingPayment {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  remark?: string;
}

export function PaymentModal({
  open,
  onClose,
  total,
  onConfirm,
  busy,
  error,
  customer,
  outlet,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (payments: PendingPayment[]) => void;
  busy: boolean;
  error: string | null;
  customer?: Customer | null;
  outlet?: Outlet | null;
}) {
  const [payments, setPayments] = useState<PendingPayment[]>([{ method: "CASH", amount: total }]);
  const [giftCardStatus, setGiftCardStatus] = useState<Record<number, string>>({});
  const [cardBrand, setCardBrand] = useState<Record<number, string>>({});
  const [cardLast4, setCardLast4] = useState<Record<number, string>>({});

  // The modal stays mounted while hidden, so re-seed the default payment
  // amount each time it opens (the cart total may have changed since the
  // last open, or since PosPage first rendered with an empty cart).
  useEffect(() => {
    if (open) {
      setPayments([{ method: "CASH", amount: round2(total) }]);
      setGiftCardStatus({});
      setCardBrand({});
      setCardLast4({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const paid = round2(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const remaining = Math.max(round2(total) - paid, 0);
  const redeemRate = Number(outlet?.loyaltyRedeemRate ?? 0.01);

  function updatePayment(i: number, patch: Partial<PendingPayment>) {
    setPayments((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function addSplit() {
    setPayments((prev) => [...prev, { method: "CASH", amount: remaining }]);
  }

  function removeSplit(i: number) {
    setPayments((prev) => prev.filter((_, idx) => idx !== i));
    setGiftCardStatus((prev) => {
      const next = { ...prev };
      delete next[i];
      return next;
    });
    setCardBrand((prev) => {
      const next = { ...prev };
      delete next[i];
      return next;
    });
    setCardLast4((prev) => {
      const next = { ...prev };
      delete next[i];
      return next;
    });
  }

  function updateCardDetails(i: number, patch: { brand?: string; last4?: string }) {
    const brand = patch.brand ?? cardBrand[i] ?? "";
    const last4 = patch.last4 ?? cardLast4[i] ?? "";
    if (patch.brand !== undefined) setCardBrand((prev) => ({ ...prev, [i]: patch.brand! }));
    if (patch.last4 !== undefined) setCardLast4((prev) => ({ ...prev, [i]: patch.last4! }));
    const reference = brand && last4.length === 4 ? `${brand} •••• ${last4}` : undefined;
    updatePayment(i, { reference });
  }

  async function checkGiftCard(i: number, code: string) {
    if (!code) return;
    try {
      const card = await lookupGiftCard(code);
      setGiftCardStatus((prev) => ({ ...prev, [i]: `Balance: ${money(Number(card.balance))}` }));
    } catch (err) {
      setGiftCardStatus((prev) => ({ ...prev, [i]: getErrorMessage(err) }));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Take Payment">
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Amount due</p>
          <p className="text-3xl font-bold">{money(total)}</p>
          {customer && (
            <p className="text-xs text-gray-400 mt-1">
              {customer.name} — {customer.pointsBalance ?? 0} points available
            </p>
          )}
        </div>

        <div className="space-y-2">
          {payments.map((p, i) => (
            <div key={i} className="space-y-1">
              <div className="flex gap-2 items-center">
                <Select
                  value={p.method}
                  onChange={(e) => {
                    const method = e.target.value as PaymentMethod;
                    updatePayment(i, { method, reference: undefined });
                    setCardBrand((prev) => ({ ...prev, [i]: "Visa" }));
                    setCardLast4((prev) => ({ ...prev, [i]: "" }));
                  }}
                  className="w-32"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="EWALLET">E-Wallet</option>
                  <option value="GIFT_CARD">Gift Card</option>
                  <option value="LOYALTY_POINTS">Loyalty Points</option>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={p.amount}
                  onChange={(e) => updatePayment(i, { amount: Number(e.target.value) })}
                />
                {payments.length > 1 && (
                  <button onClick={() => removeSplit(i)} className="text-gray-300 hover:text-red-500">
                    ✕
                  </button>
                )}
              </div>
              {p.method === "CARD" && (
                <div className="flex gap-2 items-center pl-1">
                  <Select
                    value={cardBrand[i] ?? "Visa"}
                    onChange={(e) => updateCardDetails(i, { brand: e.target.value })}
                    className="w-28 text-sm"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">Amex</option>
                    <option value="Other">Other</option>
                  </Select>
                  <Input
                    placeholder="Last 4 digits"
                    inputMode="numeric"
                    maxLength={4}
                    value={cardLast4[i] ?? ""}
                    onChange={(e) => updateCardDetails(i, { last4: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    className="text-sm"
                  />
                </div>
              )}
              {p.method === "GIFT_CARD" && (
                <div className="flex gap-2 items-center pl-1">
                  <Input
                    placeholder="Gift card code"
                    value={p.reference ?? ""}
                    onChange={(e) => updatePayment(i, { reference: e.target.value.toUpperCase() })}
                    className="text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => checkGiftCard(i, p.reference ?? "")}
                    className="text-xs text-brand-600 hover:underline whitespace-nowrap"
                  >
                    Check balance
                  </button>
                </div>
              )}
              {p.method === "GIFT_CARD" && giftCardStatus[i] && (
                <p className="text-xs text-gray-500 pl-1">{giftCardStatus[i]}</p>
              )}
              {p.method === "LOYALTY_POINTS" && (
                <p className="text-xs text-gray-500 pl-1">
                  {customer
                    ? `Uses ~${Math.ceil((Number(p.amount) || 0) / redeemRate)} points (has ${customer.pointsBalance ?? 0})`
                    : "Select a customer to redeem points"}
                </p>
              )}
              <div className="pl-1">
                <Input
                  placeholder="Remark (optional)"
                  value={p.remark ?? ""}
                  onChange={(e) => updatePayment(i, { remark: e.target.value })}
                  className="text-sm w-full"
                />
              </div>
            </div>
          ))}
          <button onClick={addSplit} className="text-sm text-brand-600 hover:underline">
            + Split payment
          </button>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Paid</span>
          <span>{money(paid)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span>{remaining > 0 ? "Remaining" : "Change"}</span>
          <span className={remaining > 0 ? "text-red-500" : "text-green-600"}>
            {money(Math.abs(round2(total) - paid))}
          </span>
        </div>

        {error && <ErrorMessage message={error} />}

        <Button className="w-full" disabled={paid < round2(total) || busy} onClick={() => onConfirm(payments)}>
          {busy ? "Processing..." : "Confirm Payment"}
        </Button>
      </div>
    </Modal>
  );
}
