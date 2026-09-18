import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useSuppliers } from "@/api/suppliers";
import { useProducts } from "@/api/products";
import {
  useCancelPurchaseOrder,
  useCreatePurchaseOrder,
  useMarkOrdered,
  usePurchaseOrders,
  useReceivePurchaseOrder,
} from "@/api/purchaseOrders";
import { Badge, Button, Card, Input, Modal, Select, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";
import { PurchaseOrderDto } from "@/api/types";

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

export function PurchaseOrdersTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts(outletId ?? undefined);
  const { data: orders, isLoading } = usePurchaseOrders(outletId ?? undefined);
  const createPO = useCreatePurchaseOrder();
  const markOrdered = useMarkOrdered();
  const cancelPO = useCancelPurchaseOrder();
  const receivePO = useReceivePurchaseOrder();

  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ productId: "", quantityOrdered: "", unitCost: "" }]);
  const [receivingId, setReceivingId] = useState<number | null>(null);

  function addRow() {
    setItems((prev) => [...prev, { productId: "", quantityOrdered: "", unitCost: "" }]);
  }
  function updateRow(i: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleCreate() {
    if (!outletId || !supplierId) return;
    const validItems = items
      .filter((i) => i.productId && Number(i.quantityOrdered) > 0)
      .map((i) => ({ productId: Number(i.productId), quantityOrdered: Number(i.quantityOrdered), unitCost: Number(i.unitCost) || 0 }));
    if (validItems.length === 0) return;
    await createPO.mutateAsync({ outletId, supplierId: Number(supplierId), items: validItems });
    setShowForm(false);
    setSupplierId("");
    setItems([{ productId: "", quantityOrdered: "", unitCost: "" }]);
  }

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  const receivingOrder = orders?.find((o) => o.id === receivingId);

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
                      <button onClick={() => markOrdered.mutate(o.id)} className="text-brand-600 hover:underline">
                        Mark Ordered
                      </button>
                    )}
                    {(o.status === "ORDERED" || o.status === "PARTIALLY_RECEIVED") && (
                      <button onClick={() => setReceivingId(o.id)} className="text-brand-600 hover:underline">
                        Receive
                      </button>
                    )}
                    {o.status !== "RECEIVED" && o.status !== "CANCELLED" && (
                      <button onClick={() => cancelPO.mutate(o.id)} className="text-red-500 hover:underline">
                        Cancel
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Purchase Order">
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
          <Button className="w-full" onClick={handleCreate} disabled={createPO.isPending || !supplierId}>
            Create Purchase Order
          </Button>
        </div>
      </Modal>

      <ReceiveModal order={receivingOrder ?? null} onClose={() => setReceivingId(null)} onReceive={receivePO.mutateAsync} busy={receivePO.isPending} />
    </div>
  );
}

function ReceiveModal({
  order,
  onClose,
  onReceive,
  busy,
}: {
  order: PurchaseOrderDto | null;
  onClose: () => void;
  onReceive: (input: { id: number; items: { itemId: number; quantityReceived: number }[] }) => Promise<unknown>;
  busy: boolean;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  if (!order) return null;

  async function handleSubmit() {
    if (!order) return;
    const items = Object.entries(quantities)
      .filter(([, v]) => Number(v) > 0)
      .map(([itemId, v]) => ({ itemId: Number(itemId), quantityReceived: Number(v) }));
    if (items.length === 0) return;
    await onReceive({ id: order.id, items });
    setQuantities({});
    onClose();
  }

  return (
    <Modal open={!!order} onClose={onClose} title="Receive Purchase Order">
      <div className="space-y-3">
        {order.items.map((item) => {
          const remaining = item.quantityOrdered - item.quantityReceived;
          return (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{item.product.name}</p>
                <p className="text-xs text-gray-400">
                  {item.quantityReceived}/{item.quantityOrdered} received — {money(Number(item.unitCost))}/unit
                </p>
              </div>
              <Input
                type="number"
                max={remaining}
                placeholder={`up to ${remaining}`}
                className="w-28"
                value={quantities[item.id] ?? ""}
                onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
              />
            </div>
          );
        })}
        <Button className="w-full" onClick={handleSubmit} disabled={busy}>
          Confirm Receipt
        </Button>
      </div>
    </Modal>
  );
}
