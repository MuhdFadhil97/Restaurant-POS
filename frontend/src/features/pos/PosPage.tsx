import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useOutlets } from "@/api/outlets";
import { useProducts } from "@/api/products";
import { useTables } from "@/api/tables";
import { useCustomers } from "@/api/customers";
import { useDiscounts } from "@/api/discounts";
import { useTaxRates } from "@/api/taxRates";
import {
  useAddItem,
  useCheckout,
  useCreateDraft,
  useFinalizeTransaction,
  useHeldTransactions,
  useRemoveItem,
  useTransaction,
  useTransactions,
  useUpdateItem,
  useUpdateTransaction,
} from "@/api/transactions";
import { Product, ProductVariant, TableDto, TransactionDto } from "@/api/types";
import { getErrorMessage } from "@/api/client";
import { Spinner } from "@/components/ui";
import { ProductGrid } from "./ProductGrid";
import { CartPanel, CartLineView } from "./CartPanel";
import { TableStrip } from "./TableStrip";
import { FloorPlanCanvas, FloorPlanLegend } from "../settings/FloorPlanCanvas";
import { PaymentModal, PendingPayment } from "./PaymentModal";
import { HeldTransactionsModal } from "./HeldTransactionsModal";
import { ReceiptPreviewModal } from "./ReceiptPreviewModal";
import { LocalCartItem, previewLine, previewTotals } from "./cartMath";
import { ShiftBar } from "./ShiftBar";
import { DeviceBanner } from "../hardware/DeviceBanner";

export function PosPage() {
  const outletId = useOutletStore((s) => s.activeOutletId);

  const { data: products, isLoading: productsLoading } = useProducts(outletId ?? undefined);
  const { data: outlets } = useOutlets();
  const { data: tables } = useTables(outletId ?? undefined);
  const { data: customers } = useCustomers();
  const { data: discounts } = useDiscounts();
  const { data: taxRates } = useTaxRates(outletId ?? undefined);
  const { data: openTransactions } = useTransactions({ outletId: outletId ?? undefined, status: "OPEN" });
  const { data: heldTransactions } = useHeldTransactions(outletId ?? undefined);

  const [localCart, setLocalCart] = useState<LocalCartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableDto | null>(null);
  const [resumingId, setResumingId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [orderDiscountId, setOrderDiscountId] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paidTransaction, setPaidTransaction] = useState<TransactionDto | null>(null);

  const { data: resumingTx } = useTransaction(resumingId ?? undefined);

  const createDraft = useCreateDraft();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const removeItem = useRemoveItem();
  const updateTransaction = useUpdateTransaction();
  const finalize = useFinalizeTransaction();
  const checkout = useCheckout();

  if (!outletId) {
    return <p className="text-gray-500">Select an outlet to start selling.</p>;
  }
  if (productsLoading || !products) {
    return <Spinner />;
  }

  const orderDiscountObj = discounts?.find((d) => d.id === orderDiscountId) ?? null;
  const activeOutlet = outlets?.find((o) => o.id === outletId) ?? null;
  const defaultTaxRate = taxRates?.find((t) => t.isDefault)?.rate ?? 0;
  const serviceChargeConfig = {
    enabled: activeOutlet?.serviceChargeEnabled ?? false,
    rate: activeOutlet?.serviceChargeRate ?? 0,
    taxRate: defaultTaxRate,
  };

  const lines: CartLineView[] = resumingTx
    ? resumingTx.items.map((item) => ({
        key: item.id,
        name: item.product.name,
        variantLabel: item.variant?.value,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount),
        lineTotal: Number(item.lineTotal),
      }))
    : localCart.map((item) => {
        const p = previewLine(item);
        return {
          key: item.key,
          name: item.product.name,
          variantLabel: item.variant?.value,
          quantity: item.quantity,
          unitPrice: p.unitPrice,
          discountAmount: p.discountAmount,
          lineTotal: p.lineTotal,
        };
      });

  const totals = resumingTx
    ? {
        subtotal: Number(resumingTx.subtotal),
        discountTotal: Number(resumingTx.discountTotal),
        serviceChargeTotal: Number(resumingTx.serviceChargeTotal),
        taxTotal: Number(resumingTx.taxTotal),
        total: Number(resumingTx.total),
      }
    : previewTotals(localCart, orderDiscountObj, serviceChargeConfig);

  function toItemInputs() {
    return localCart.map((item) => ({
      productId: item.product.id,
      variantId: item.variant?.id,
      quantity: item.quantity,
      discountId: item.discount?.id,
    }));
  }

  function resetAll() {
    setLocalCart([]);
    setResumingId(null);
    setSelectedTable(null);
    setCustomerId(null);
    setOrderDiscountId(null);
  }

  function handleSelectProduct(product: Product, variant: ProductVariant | null) {
    if (resumingTx) {
      addItem.mutate({ transactionId: resumingTx.id, productId: product.id, variantId: variant?.id, quantity: 1 });
      return;
    }
    setLocalCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id && i.variant?.id === variant?.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { key: crypto.randomUUID(), product, variant, quantity: 1, discount: null }];
    });
  }

  function handleQtyChange(key: string | number, quantity: number) {
    if (resumingTx) {
      if (quantity <= 0) {
        removeItem.mutate({ transactionId: resumingTx.id, itemId: key as number });
      } else {
        updateItem.mutate({ transactionId: resumingTx.id, itemId: key as number, quantity });
      }
      return;
    }
    setLocalCart((prev) =>
      quantity <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, quantity } : i))
    );
  }

  function handleRemove(key: string | number) {
    if (resumingTx) {
      removeItem.mutate({ transactionId: resumingTx.id, itemId: key as number });
      return;
    }
    setLocalCart((prev) => prev.filter((i) => i.key !== key));
  }

  function handleSelectTable(table: TableDto | null) {
    // Switching table selection only replaces the cart when we're jumping
    // into an existing server-side draft (occupied table); a plain walk-in
    // cart the cashier already built should survive picking/deselecting a
    // table, not get silently discarded.
    if (!table) {
      setSelectedTable(null);
      setResumingId(null);
      return;
    }
    if (table.status === "NOT_AVAILABLE") return;
    if (table.status === "OCCUPIED") {
      const found = openTransactions?.find((t) => t.tableId === table.id);
      if (found) {
        setSelectedTable(table);
        setResumingId(found.id);
        setLocalCart([]);
        return;
      }
    }
    setSelectedTable(table);
    setResumingId(null);
  }

  function handleCustomerChange(id: number | null) {
    setCustomerId(id);
    if (resumingTx) updateTransaction.mutate({ id: resumingTx.id, input: { customerId: id } });
  }

  function handleOrderDiscountChange(id: number | null) {
    setOrderDiscountId(id);
    if (resumingTx) updateTransaction.mutate({ id: resumingTx.id, input: { orderDiscountId: id } });
  }

  async function handleHold() {
    if (localCart.length === 0) return;
    await createDraft.mutateAsync({
      outletId: outletId!,
      items: toItemInputs(),
      customerId: customerId || undefined,
      orderDiscountId: orderDiscountId || undefined,
    });
    resetAll();
  }

  async function handleSendToTable() {
    if (!selectedTable) return;
    const created = await createDraft.mutateAsync({
      outletId: outletId!,
      tableId: selectedTable.id,
      items: toItemInputs(),
      customerId: customerId || undefined,
      orderDiscountId: orderDiscountId || undefined,
    });
    setResumingId(created.id);
    setLocalCart([]);
  }

  async function handleResumeHeld(t: TransactionDto) {
    setResumingId(t.id);
    setSelectedTable(t.table ?? null);
    setCustomerId(t.customerId ?? null);
    setOrderDiscountId(t.orderDiscountId ?? null);
    setLocalCart([]);
    setShowHeld(false);
  }

  async function handlePayConfirm(payments: PendingPayment[]) {
    setPaymentError(null);
    try {
      let completed: TransactionDto;
      if (resumingTx) {
        completed = await finalize.mutateAsync({ id: resumingTx.id, payments });
      } else {
        completed = await checkout.mutateAsync({
          outletId: outletId!,
          tableId: selectedTable?.id,
          items: toItemInputs(),
          customerId: customerId || undefined,
          orderDiscountId: orderDiscountId || undefined,
          payments,
        });
      }
      setShowPayment(false);
      resetAll();
      setPaidTransaction(completed);
    } catch (err) {
      setPaymentError(getErrorMessage(err));
    }
  }

  const hasFloorPlan = (tables ?? []).some((t) => t.posX !== null && t.posY !== null);

  const busy =
    createDraft.isPending ||
    addItem.isPending ||
    updateItem.isPending ||
    removeItem.isPending ||
    finalize.isPending ||
    checkout.isPending;

  return (
    <div className="flex flex-col h-full gap-4">
      <DeviceBanner outletId={outletId} />
      <ShiftBar outletId={outletId} />
      {hasFloorPlan ? (
        <div className="flex items-start gap-3">
          <button
            onClick={() => handleSelectTable(null)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border ${
              selectedTable === null
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            Takeaway / Walk-in
          </button>
          <div className="flex-1 space-y-2">
            <FloorPlanCanvas
              tables={tables ?? []}
              editable={false}
              selectedTableId={selectedTable?.id ?? null}
              onSelect={handleSelectTable}
              className="min-h-[220px]"
            />
            <FloorPlanLegend />
          </div>
          <button
            onClick={() => setShowHeld(true)}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Held ({heldTransactions?.length ?? 0})
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <TableStrip tables={tables ?? []} selectedTableId={selectedTable?.id ?? null} onSelect={handleSelectTable} />
          <button
            onClick={() => setShowHeld(true)}
            className="shrink-0 ml-3 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Held ({heldTransactions?.length ?? 0})
          </button>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        <div className="lg:col-span-2 min-h-0">
          <ProductGrid products={products} onSelect={handleSelectProduct} />
        </div>
        <div className="min-h-0">
          <CartPanel
            lines={lines}
            totals={totals}
            tableName={selectedTable?.name}
            orderOrigin={resumingTx?.origin}
            customers={customers ?? []}
            customerId={customerId}
            onCustomerChange={handleCustomerChange}
            discounts={discounts ?? []}
            orderDiscountId={orderDiscountId}
            onOrderDiscountChange={handleOrderDiscountChange}
            onQtyChange={handleQtyChange}
            onRemove={handleRemove}
            onHold={!resumingTx && !selectedTable ? handleHold : undefined}
            onSendToTable={!resumingTx && selectedTable ? handleSendToTable : undefined}
            onPay={() => setShowPayment(true)}
            canHold={!resumingTx && !selectedTable && localCart.length > 0}
            canSendToTable={!resumingTx && !!selectedTable && localCart.length > 0}
            busy={busy}
          />
        </div>
      </div>

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        total={totals.total}
        onConfirm={handlePayConfirm}
        busy={finalize.isPending || checkout.isPending}
        error={paymentError}
        customer={customers?.find((c) => c.id === customerId) ?? null}
        outlet={activeOutlet}
      />

      <HeldTransactionsModal
        open={showHeld}
        onClose={() => setShowHeld(false)}
        transactions={heldTransactions ?? []}
        onResume={handleResumeHeld}
      />

      <ReceiptPreviewModal transaction={paidTransaction} onClose={() => setPaidTransaction(null)} />
    </div>
  );
}
