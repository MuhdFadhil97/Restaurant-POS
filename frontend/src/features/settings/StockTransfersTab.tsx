import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useOutlets } from "@/api/outlets";
import { useProducts } from "@/api/products";
import {
  useCancelStockTransfer,
  useCreateStockTransfer,
  useReceiveStockTransfer,
  useSendStockTransfer,
  useStockTransfers,
} from "@/api/stockTransfers";
import { Badge, Button, Card, Modal, Select, Spinner } from "@/components/ui";

const statusColor: Record<string, "gray" | "yellow" | "blue" | "green" | "red"> = {
  PENDING: "gray",
  IN_TRANSIT: "yellow",
  RECEIVED: "green",
  CANCELLED: "red",
};

interface DraftItem {
  productId: string;
  quantity: string;
}

export function StockTransfersTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: outlets } = useOutlets();
  const { data: products } = useProducts(outletId ?? undefined);
  const { data: transfers, isLoading } = useStockTransfers(outletId ?? undefined);
  const createTransfer = useCreateStockTransfer();
  const sendTransfer = useSendStockTransfer();
  const receiveTransfer = useReceiveStockTransfer();
  const cancelTransfer = useCancelStockTransfer();

  const [showForm, setShowForm] = useState(false);
  const [toOutletId, setToOutletId] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ productId: "", quantity: "" }]);

  function addRow() {
    setItems((prev) => [...prev, { productId: "", quantity: "" }]);
  }
  function updateRow(i: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleCreate() {
    if (!outletId || !toOutletId) return;
    const validItems = items
      .filter((i) => i.productId && Number(i.quantity) > 0)
      .map((i) => ({ productId: Number(i.productId), quantity: Number(i.quantity) }));
    if (validItems.length === 0) return;
    await createTransfer.mutateAsync({ fromOutletId: outletId, toOutletId: Number(toOutletId), items: validItems });
    setShowForm(false);
    setToOutletId("");
    setItems([{ productId: "", quantity: "" }]);
  }

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  const otherOutlets = outlets?.filter((o) => o.id !== outletId) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Transfer</Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">From</th>
                <th className="px-4 py-2">To</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transfers?.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2">{t.fromOutlet?.name ?? outlets?.find((o) => o.id === t.fromOutletId)?.name}</td>
                  <td className="px-4 py-2">{t.toOutlet?.name ?? outlets?.find((o) => o.id === t.toOutletId)?.name}</td>
                  <td className="px-4 py-2">{t._count?.items ?? t.items.length}</td>
                  <td className="px-4 py-2">
                    <Badge color={statusColor[t.status]}>{t.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {t.status === "PENDING" && t.fromOutletId === outletId && (
                      <>
                        <button onClick={() => sendTransfer.mutate(t.id)} className="text-brand-600 hover:underline">
                          Send
                        </button>
                        <button onClick={() => cancelTransfer.mutate(t.id)} className="text-red-500 hover:underline">
                          Cancel
                        </button>
                      </>
                    )}
                    {t.status === "IN_TRANSIT" && t.toOutletId === outletId && (
                      <button onClick={() => receiveTransfer.mutate(t.id)} className="text-brand-600 hover:underline">
                        Receive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {transfers?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No stock transfers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Stock Transfer">
        <div className="space-y-3">
          <Select value={toOutletId} onChange={(e) => setToOutletId(e.target.value)}>
            <option value="">Transfer to outlet...</option>
            {otherOutlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <div className="space-y-2">
            {items.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-center">
                <Select
                  value={row.productId}
                  onChange={(e) => updateRow(i, { productId: e.target.value })}
                  className="col-span-2"
                >
                  <option value="">Product</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.stocks?.[0]?.quantity ?? 0} on hand)
                    </option>
                  ))}
                </Select>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => updateRow(i, { quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
          <Button className="w-full" onClick={handleCreate} disabled={createTransfer.isPending || !toOutletId}>
            Create Transfer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
