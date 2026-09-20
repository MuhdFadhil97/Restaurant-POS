import { Customer, Discount, TransactionOrigin } from "@/api/types";
import { Button, Select } from "@/components/ui";
import { money } from "./cartMath";

export interface CartLineView {
  key: string | number;
  name: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface CartTotals {
  subtotal: number;
  discountTotal: number;
  serviceChargeTotal: number;
  taxTotal: number;
  total: number;
}

export function CartPanel({
  lines,
  totals,
  tableName,
  orderOrigin,
  customers,
  customerId,
  onCustomerChange,
  discounts,
  orderDiscountId,
  onOrderDiscountChange,
  onQtyChange,
  onRemove,
  onHold,
  onSendToTable,
  onPay,
  canHold,
  canSendToTable,
  busy,
}: {
  lines: CartLineView[];
  totals: CartTotals;
  tableName?: string | null;
  orderOrigin?: TransactionOrigin;
  customers: Customer[];
  customerId: number | null;
  onCustomerChange: (id: number | null) => void;
  discounts: Discount[];
  orderDiscountId: number | null;
  onOrderDiscountChange: (id: number | null) => void;
  onQtyChange: (key: string | number, quantity: number) => void;
  onRemove: (key: string | number) => void;
  onHold?: () => void;
  onSendToTable?: () => void;
  onPay: () => void;
  canHold: boolean;
  canSendToTable: boolean;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold">Current Order</h2>
        <div className="flex items-center gap-2">
          {orderOrigin === "QR" && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Ordered via QR</span>
          )}
          {tableName && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full">{tableName}</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {lines.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Cart is empty</p>}
        {lines.map((line) => (
          <div key={line.key} className="px-4 py-3 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{line.name}</p>
              {line.variantLabel && <p className="text-xs text-gray-400">{line.variantLabel}</p>}
              <p className="text-xs text-gray-400">{money(line.unitPrice)} each</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onQtyChange(line.key, line.quantity - 1)}
                className="w-6 h-6 rounded bg-gray-100 text-sm hover:bg-gray-200"
              >
                −
              </button>
              <span className="w-6 text-center text-sm">{line.quantity}</span>
              <button
                onClick={() => onQtyChange(line.key, line.quantity + 1)}
                className="w-6 h-6 rounded bg-gray-100 text-sm hover:bg-gray-200"
              >
                +
              </button>
            </div>
            <div className="w-16 text-right text-sm font-medium">{money(line.lineTotal)}</div>
            <button onClick={() => onRemove(line.key)} className="text-gray-300 hover:text-red-500 text-sm">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Select value={customerId ?? ""} onChange={(e) => onCustomerChange(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Walk-in customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={orderDiscountId ?? ""} onChange={(e) => onOrderDiscountChange(e.target.value ? Number(e.target.value) : null)}>
            <option value="">No order discount</option>
            {discounts
              .filter((d) => d.scope === "ORDER")
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </Select>
        </div>

        <div className="text-sm space-y-1">
          <Row label="Subtotal" value={totals.subtotal} />
          <Row label="Discount" value={-totals.discountTotal} />
          {totals.serviceChargeTotal > 0 && <Row label="Service Charge" value={totals.serviceChargeTotal} />}
          <Row label="Tax" value={totals.taxTotal} />
          <div className="flex justify-between font-semibold text-base pt-1 border-t border-gray-200">
            <span>Total</span>
            <span>{money(totals.total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {onHold && (
            <Button variant="secondary" onClick={onHold} disabled={!canHold || busy}>
              Hold
            </Button>
          )}
          {onSendToTable && (
            <Button variant="secondary" onClick={onSendToTable} disabled={!canSendToTable || busy}>
              Send to Table
            </Button>
          )}
          <Button onClick={onPay} disabled={lines.length === 0 || busy} className={onHold || onSendToTable ? "" : "col-span-2"}>
            Pay
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  );
}
