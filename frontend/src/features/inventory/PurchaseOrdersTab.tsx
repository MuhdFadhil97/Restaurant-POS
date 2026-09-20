import { useEffect, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useAuthStore } from "@/store/authStore";
import { useSuppliers } from "@/api/suppliers";
import { useProducts } from "@/api/products";
import { useTaxRates } from "@/api/taxRates";
import {
  downloadPurchaseOrderPdf,
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useCreatePurchaseOrder,
  useDeletePurchaseOrder,
  useMarkOrdered,
  usePurchaseOrder,
  usePurchaseOrders,
  useRejectPurchaseOrder,
  useSubmitForApproval,
  useUpdatePurchaseOrder,
} from "@/api/purchaseOrders";
import { useCreateGoodsReceivedNote } from "@/api/goodsReceivedNotes";
import { getErrorMessage } from "@/api/client";
import { Badge, Button, Card, ErrorMessage, Input, Modal, Select, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";
import { Product, Supplier, TaxRate } from "@/api/types";

const statusColor: Record<string, "gray" | "yellow" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  PENDING_APPROVAL: "yellow",
  APPROVED: "blue",
  ORDERED: "blue",
  PARTIALLY_RECEIVED: "yellow",
  RECEIVED: "green",
  CANCELLED: "red",
};

interface DraftItem {
  productId: string;
  quantityOrdered: string;
  unitCost: string;
  taxRateId: string;
  discountAmount: string;
}

const emptyItems: DraftItem[] = [{ productId: "", quantityOrdered: "", unitCost: "", taxRateId: "", discountAmount: "" }];

function computeLineTotals(row: DraftItem, taxRates?: TaxRate[]) {
  const qty = Number(row.quantityOrdered) || 0;
  const unitCost = Number(row.unitCost) || 0;
  const discount = Number(row.discountAmount) || 0;
  const rate = taxRates?.find((t) => String(t.id) === row.taxRateId)?.rate ?? 0;
  const taxable = Math.max(qty * unitCost - discount, 0);
  const taxAmount = Math.round(taxable * (rate / 100) * 100) / 100;
  const lineTotal = Math.round((taxable + taxAmount) * 100) / 100;
  return { taxAmount, lineTotal };
}

function computeOrderTotals(items: DraftItem[], taxRates?: TaxRate[]) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  for (const row of items) {
    const qty = Number(row.quantityOrdered) || 0;
    const unitCost = Number(row.unitCost) || 0;
    subtotal += qty * unitCost;
    discountTotal += Number(row.discountAmount) || 0;
    taxTotal += computeLineTotals(row, taxRates).taxAmount;
  }
  const total = subtotal - discountTotal + taxTotal;
  return { subtotal, discountTotal, taxTotal, total };
}

export function PurchaseOrdersTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const role = useAuthStore((s) => s.user?.role);
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts(outletId ?? undefined);
  const { data: taxRates } = useTaxRates(outletId ?? undefined);
  const { data: orders, isLoading } = usePurchaseOrders(outletId ?? undefined);
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const deletePO = useDeletePurchaseOrder();
  const submitForApproval = useSubmitForApproval();
  const approvePO = useApprovePurchaseOrder();
  const rejectPO = useRejectPurchaseOrder();
  const markOrdered = useMarkOrdered();
  const cancelPO = useCancelPurchaseOrder();
  const createGrn = useCreateGoodsReceivedNote();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [receivingId, setReceivingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data: editingOrder } = usePurchaseOrder(editingId ?? undefined);

  const isAdmin = role === "ADMIN";

  async function handleCreate(supplierId: number, items: DraftItem[]) {
    if (!outletId) return;
    const validItems = items
      .filter((i) => i.productId && Number(i.quantityOrdered) > 0)
      .map((i) => ({
        productId: Number(i.productId),
        quantityOrdered: Number(i.quantityOrdered),
        unitCost: Number(i.unitCost) || 0,
        taxRateId: i.taxRateId ? Number(i.taxRateId) : undefined,
        discountAmount: Number(i.discountAmount) || 0,
      }));
    if (validItems.length === 0) return;
    await createPO.mutateAsync({ outletId, supplierId, items: validItems });
    setShowForm(false);
  }

  async function handleUpdate(supplierId: number, items: DraftItem[]) {
    if (!editingId) return;
    const validItems = items
      .filter((i) => i.productId && Number(i.quantityOrdered) > 0)
      .map((i) => ({
        productId: Number(i.productId),
        quantityOrdered: Number(i.quantityOrdered),
        unitCost: Number(i.unitCost) || 0,
        taxRateId: i.taxRateId ? Number(i.taxRateId) : undefined,
        discountAmount: Number(i.discountAmount) || 0,
      }));
    if (validItems.length === 0) return;
    await updatePO.mutateAsync({ id: editingId, input: { supplierId, items: validItems } });
    setEditingId(null);
  }

  async function handleDelete(orderId: number) {
    if (!window.confirm("Delete this draft purchase order? This cannot be undone.")) return;
    await deletePO.mutateAsync(orderId);
  }

  async function handleCancel(orderId: number) {
    if (!window.confirm("Cancel this purchase order?")) return;
    await cancelPO.mutateAsync(orderId);
  }

  async function runAction(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Purchase Order</Button>
      </div>

      {actionError && <ErrorMessage message={actionError} />}

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">PO #</th>
                <th className="px-4 py-2">Supplier</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders?.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 font-medium">{o.poNumber}</td>
                  <td className="px-4 py-2">{suppliers?.find((s) => s.id === o.supplierId)?.name ?? "-"}</td>
                  <td className="px-4 py-2">{o._count?.items ?? o.items.length}</td>
                  <td className="px-4 py-2">{money(Number(o.total))}</td>
                  <td className="px-4 py-2">
                    <Badge color={statusColor[o.status]}>{o.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                    {o.status === "DRAFT" && (
                      <>
                        <button onClick={() => setEditingId(o.id)} className="text-brand-600 hover:underline">
                          Edit
                        </button>
                        <button
                          onClick={() => runAction(() => submitForApproval.mutateAsync(o.id))}
                          className="text-brand-600 hover:underline"
                        >
                          Submit for Approval
                        </button>
                        <button onClick={() => handleDelete(o.id)} className="text-red-500 hover:underline">
                          Delete
                        </button>
                      </>
                    )}
                    {o.status === "PENDING_APPROVAL" && isAdmin && (
                      <>
                        <button
                          onClick={() => runAction(() => approvePO.mutateAsync(o.id))}
                          className="text-brand-600 hover:underline"
                        >
                          Approve
                        </button>
                        <button onClick={() => setRejectingId(o.id)} className="text-red-500 hover:underline">
                          Reject
                        </button>
                      </>
                    )}
                    {o.status === "PENDING_APPROVAL" && !isAdmin && (
                      <span className="text-gray-400 text-xs">Awaiting admin approval</span>
                    )}
                    {o.status === "APPROVED" && (
                      <button onClick={() => markOrdered.mutate(o.id)} className="text-brand-600 hover:underline">
                        Confirm Order
                      </button>
                    )}
                    {(o.status === "ORDERED" || o.status === "PARTIALLY_RECEIVED") && (
                      <button onClick={() => setReceivingId(o.id)} className="text-brand-600 hover:underline">
                        Receive
                      </button>
                    )}
                    {o.status !== "DRAFT" && o.status !== "PENDING_APPROVAL" && (
                      <button
                        onClick={() => downloadPurchaseOrderPdf(o.id, o.poNumber)}
                        className="text-brand-600 hover:underline"
                      >
                        PDF
                      </button>
                    )}
                    {o.status !== "RECEIVED" && o.status !== "CANCELLED" && (
                      <button onClick={() => handleCancel(o.id)} className="text-red-500 hover:underline">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No purchase orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <PurchaseOrderFormModal
        open={showForm}
        title="New Purchase Order"
        submitLabel="Create Purchase Order"
        suppliers={suppliers}
        products={products}
        taxRates={taxRates}
        submitting={createPO.isPending}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreate}
      />

      <PurchaseOrderFormModal
        open={!!editingId}
        title="Edit Purchase Order"
        submitLabel="Save Changes"
        suppliers={suppliers}
        products={products}
        taxRates={taxRates}
        submitting={updatePO.isPending}
        initialSupplierId={editingOrder?.supplierId}
        initialItems={editingOrder?.items.map((i) => ({
          productId: String(i.productId),
          quantityOrdered: String(i.quantityOrdered),
          unitCost: String(i.unitCost),
          taxRateId: i.taxRateId ? String(i.taxRateId) : "",
          discountAmount: i.discountAmount ? String(i.discountAmount) : "",
        }))}
        onClose={() => setEditingId(null)}
        onSubmit={handleUpdate}
      />

      <ReceiveModal
        orderId={receivingId}
        onClose={() => setReceivingId(null)}
        onReceive={createGrn.mutateAsync}
        busy={createGrn.isPending}
      />

      <RejectModal
        orderId={rejectingId}
        onClose={() => setRejectingId(null)}
        onReject={(reason) => rejectPO.mutateAsync({ id: rejectingId!, reason })}
        busy={rejectPO.isPending}
      />
    </div>
  );
}

function PurchaseOrderFormModal({
  open,
  title,
  submitLabel,
  suppliers,
  products,
  taxRates,
  submitting,
  initialSupplierId,
  initialItems,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  suppliers?: Supplier[];
  products?: Product[];
  taxRates?: TaxRate[];
  submitting: boolean;
  initialSupplierId?: number;
  initialItems?: DraftItem[];
  onClose: () => void;
  onSubmit: (supplierId: number, items: DraftItem[]) => Promise<void>;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<DraftItem[]>(emptyItems);

  // Re-seed fields whenever the modal opens, mirroring SuppliersTab's fix for
  // stale form state when reopening on a different (or newly loaded) record.
  useEffect(() => {
    if (open) {
      setSupplierId(initialSupplierId ? String(initialSupplierId) : "");
      setItems(initialItems && initialItems.length > 0 ? initialItems : emptyItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSupplierId, initialItems]);

  function addRow() {
    setItems((prev) => [...prev, { productId: "", quantityOrdered: "", unitCost: "", taxRateId: "", discountAmount: "" }]);
  }
  function updateRow(i: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!supplierId) return;
    await onSubmit(Number(supplierId), items);
  }

  const totals = computeOrderTotals(items, taxRates);

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClassName="max-w-2xl">
      <div className="space-y-3">
        <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">Select supplier</option>
          {suppliers?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <div className="space-y-2">
          {items.map((row, i) => {
            const { lineTotal } = computeLineTotals(row, taxRates);
            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Select
                  value={row.productId}
                  onChange={(e) => updateRow(i, { productId: e.target.value })}
                  className="col-span-3"
                >
                  <option value="">Product</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  placeholder="Qty"
                  className="col-span-1"
                  value={row.quantityOrdered}
                  onChange={(e) => updateRow(i, { quantityOrdered: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Unit cost"
                  className="col-span-2"
                  value={row.unitCost}
                  onChange={(e) => updateRow(i, { unitCost: e.target.value })}
                />
                <Select
                  value={row.taxRateId}
                  onChange={(e) => updateRow(i, { taxRateId: e.target.value })}
                  className="col-span-2"
                >
                  <option value="">No tax</option>
                  {taxRates?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({Number(t.rate)}%)
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Discount"
                  className="col-span-2"
                  value={row.discountAmount}
                  onChange={(e) => updateRow(i, { discountAmount: e.target.value })}
                />
                <div className="col-span-1 text-xs text-gray-500 text-right">{money(lineTotal)}</div>
                <button onClick={() => removeRow(i)} className="col-span-1 text-gray-300 hover:text-red-500">
                  ✕
                </button>
              </div>
            );
          })}
          <button onClick={addRow} className="text-sm text-brand-600 hover:underline">
            + Add item
          </button>
        </div>

        <div className="border-t border-gray-100 pt-2 space-y-1 text-sm ml-auto w-56">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{money(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Discount</span>
            <span>-{money(totals.discountTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax</span>
            <span>{money(totals.taxTotal)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-gray-100 pt-1">
            <span>Total</span>
            <span>{money(totals.total)}</span>
          </div>
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={submitting || !supplierId}>
          {submitLabel}
        </Button>
      </div>
    </Modal>
  );
}

function RejectModal({
  orderId,
  onClose,
  onReject,
  busy,
}: {
  orderId: number | null;
  onClose: () => void;
  onReject: (reason: string) => Promise<unknown>;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      setReason("");
      setError(null);
    }
  }, [orderId]);

  if (!orderId) return null;

  async function handleSubmit() {
    if (!reason.trim()) return;
    setError(null);
    try {
      await onReject(reason.trim());
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={!!orderId} onClose={onClose} title="Reject Purchase Order">
      <div className="space-y-3">
        <Input placeholder="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <ErrorMessage message={error} />}
        <Button variant="danger" className="w-full" onClick={handleSubmit} disabled={busy || !reason.trim()}>
          {busy ? "Rejecting..." : "Reject & Send Back to Draft"}
        </Button>
      </div>
    </Modal>
  );
}

interface ReceiveRow {
  received: string;
  rejected: string;
  rejectionReason: string;
}

function ReceiveModal({
  orderId,
  onClose,
  onReceive,
  busy,
}: {
  orderId: number | null;
  onClose: () => void;
  onReceive: (input: {
    purchaseOrderId: number;
    notes?: string;
    items: { purchaseOrderItemId: number; quantityReceived: number; quantityRejected?: number; rejectionReason?: string }[];
  }) => Promise<unknown>;
  busy: boolean;
}) {
  const { data: order } = usePurchaseOrder(orderId ?? undefined);
  const [rows, setRows] = useState<Record<string, ReceiveRow>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!orderId) return null;

  const emptyRow: ReceiveRow = { received: "", rejected: "", rejectionReason: "" };

  function updateRow(itemId: number, patch: Partial<ReceiveRow>) {
    setRows((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? emptyRow), ...patch },
    }));
  }

  async function handleSubmit() {
    if (!order) return;
    setError(null);
    const items = Object.entries(rows)
      .map(([itemId, row]) => ({
        purchaseOrderItemId: Number(itemId),
        quantityReceived: Number(row.received) || 0,
        quantityRejected: Number(row.rejected) || 0,
        rejectionReason: row.rejectionReason || undefined,
      }))
      .filter((i) => i.quantityReceived > 0 || i.quantityRejected > 0);
    if (items.length === 0) return;
    try {
      await onReceive({ purchaseOrderId: order.id, notes: notes || undefined, items });
      setRows({});
      setNotes("");
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={!!orderId} onClose={onClose} title="Receive Purchase Order (Goods Received Note)">
      {!order ? (
        <Spinner />
      ) : (
      <div className="space-y-3">
        {order.items.map((item) => {
          const remaining = item.quantityOrdered - item.quantityReceived;
          const row = rows[item.id] ?? { received: "", rejected: "", rejectionReason: "" };
          return (
            <div key={item.id} className="space-y-1 border-b border-gray-100 pb-2 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{item.product.name}</p>
                  <p className="text-xs text-gray-400">
                    {item.quantityReceived}/{item.quantityOrdered} received — {money(Number(item.unitCost))}/unit —
                    up to {remaining} remaining
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Input
                    type="number"
                    max={remaining}
                    placeholder="Received"
                    className="w-24"
                    value={row.received}
                    onChange={(e) => updateRow(item.id, { received: e.target.value })}
                  />
                  <Input
                    type="number"
                    max={remaining}
                    placeholder="Rejected"
                    className="w-24"
                    value={row.rejected}
                    onChange={(e) => updateRow(item.id, { rejected: e.target.value })}
                  />
                </div>
              </div>
              {Number(row.rejected) > 0 && (
                <Input
                  placeholder="Rejection reason (e.g. damaged, short-shipped)"
                  value={row.rejectionReason}
                  onChange={(e) => updateRow(item.id, { rejectionReason: e.target.value })}
                />
              )}
            </div>
          );
        })}
        <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <ErrorMessage message={error} />}
        <Button className="w-full" onClick={handleSubmit} disabled={busy}>
          {busy ? "Saving..." : "Confirm Receipt"}
        </Button>
      </div>
      )}
    </Modal>
  );
}
