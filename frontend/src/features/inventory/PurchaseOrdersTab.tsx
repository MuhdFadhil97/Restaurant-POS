import { useEffect, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useSuppliers } from "@/api/suppliers";
import { useProducts } from "@/api/products";
import {
  useCancelPurchaseOrder,
  useCreatePurchaseOrder,
  useDeletePurchaseOrder,
  useMarkOrdered,
  usePurchaseOrder,
  usePurchaseOrders,
  useUpdatePurchaseOrder,
} from "@/api/purchaseOrders";
import { useCreateGoodsReceivedNote } from "@/api/goodsReceivedNotes";
import { getErrorMessage } from "@/api/client";
import { Badge, Button, Card, ErrorMessage, Input, Modal, Select, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";
import { Product, Supplier } from "@/api/types";

const statusColor: Record<string, "gray" | "yellow" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  ORDERED: "blue",
  PARTIALLY_RECEIVED: "yellow",
  RECEIVED: "green",
  CANCELLED: "red",
};

interface DraftItem {
  productId: string;
  quantityOrdered: string;
  unitCost: string;
}

const emptyItems: DraftItem[] = [{ productId: "", quantityOrdered: "", unitCost: "" }];

export function PurchaseOrdersTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts(outletId ?? undefined);
  const { data: orders, isLoading } = usePurchaseOrders(outletId ?? undefined);
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const deletePO = useDeletePurchaseOrder();
  const markOrdered = useMarkOrdered();
  const cancelPO = useCancelPurchaseOrder();
  const createGrn = useCreateGoodsReceivedNote();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [receivingId, setReceivingId] = useState<number | null>(null);
  const { data: editingOrder } = usePurchaseOrder(editingId ?? undefined);

  async function handleCreate(supplierId: number, items: DraftItem[]) {
    if (!outletId) return;
    const validItems = items
      .filter((i) => i.productId && Number(i.quantityOrdered) > 0)
      .map((i) => ({ productId: Number(i.productId), quantityOrdered: Number(i.quantityOrdered), unitCost: Number(i.unitCost) || 0 }));
    if (validItems.length === 0) return;
    await createPO.mutateAsync({ outletId, supplierId, items: validItems });
    setShowForm(false);
  }

  async function handleUpdate(supplierId: number, items: DraftItem[]) {
    if (!editingId) return;
    const validItems = items
      .filter((i) => i.productId && Number(i.quantityOrdered) > 0)
      .map((i) => ({ productId: Number(i.productId), quantityOrdered: Number(i.quantityOrdered), unitCost: Number(i.unitCost) || 0 }));
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

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Purchase Order</Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Supplier</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders?.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2">{suppliers?.find((s) => s.id === o.supplierId)?.name ?? "-"}</td>
                  <td className="px-4 py-2">{o._count?.items ?? o.items.length}</td>
                  <td className="px-4 py-2">
                    <Badge color={statusColor[o.status]}>{o.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {o.status === "DRAFT" && (
                      <>
                        <button onClick={() => setEditingId(o.id)} className="text-brand-600 hover:underline">
                          Edit
                        </button>
                        <button onClick={() => markOrdered.mutate(o.id)} className="text-brand-600 hover:underline">
                          Confirm Order
                        </button>
                      </>
                    )}
                    {(o.status === "ORDERED" || o.status === "PARTIALLY_RECEIVED") && (
                      <button onClick={() => setReceivingId(o.id)} className="text-brand-600 hover:underline">
                        Receive
                      </button>
                    )}
                    {o.status !== "RECEIVED" && o.status !== "CANCELLED" && (
                      <button onClick={() => handleCancel(o.id)} className="text-red-500 hover:underline">
                        Cancel
                      </button>
                    )}
                    {o.status === "DRAFT" && (
                      <button onClick={() => handleDelete(o.id)} className="text-red-500 hover:underline">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
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
        submitting={updatePO.isPending}
        initialSupplierId={editingOrder?.supplierId}
        initialItems={editingOrder?.items.map((i) => ({
          productId: String(i.productId),
          quantityOrdered: String(i.quantityOrdered),
          unitCost: String(i.unitCost),
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
    </div>
  );
}

function PurchaseOrderFormModal({
  open,
  title,
  submitLabel,
  suppliers,
  products,
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
    setItems((prev) => [...prev, { productId: "", quantityOrdered: "", unitCost: "" }]);
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

  return (
    <Modal open={open} onClose={onClose} title={title}>
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
          {items.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 items-center">
              <Select
                value={row.productId}
                onChange={(e) => updateRow(i, { productId: e.target.value })}
                className="col-span-2"
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
                value={row.quantityOrdered}
                onChange={(e) => updateRow(i, { quantityOrdered: e.target.value })}
              />
              <div className="flex gap-1">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Unit cost"
                  value={row.unitCost}
                  onChange={(e) => updateRow(i, { unitCost: e.target.value })}
                />
                <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500">
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button onClick={addRow} className="text-sm text-brand-600 hover:underline">
            + Add item
          </button>
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={submitting || !supplierId}>
          {submitLabel}
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
