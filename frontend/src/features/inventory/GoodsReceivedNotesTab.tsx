import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useGoodsReceivedNote, useGoodsReceivedNotes } from "@/api/goodsReceivedNotes";
import { Badge, Card, Modal, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";

export function GoodsReceivedNotesTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: grns, isLoading } = useGoodsReceivedNotes(outletId ?? undefined);
  const [viewingId, setViewingId] = useState<number | null>(null);

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Received</th>
                <th className="px-4 py-2">Purchase Order</th>
                <th className="px-4 py-2">Supplier</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Received By</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grns?.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(g.receivedAt).toLocaleString()}</td>
                  <td className="px-4 py-2">PO #{g.purchaseOrderId}</td>
                  <td className="px-4 py-2">{g.purchaseOrder?.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-2">{g._count?.items ?? g.items.length}</td>
                  <td className="px-4 py-2">{g.receivedBy?.name ?? "-"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setViewingId(g.id)} className="text-brand-600 hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {grns?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No goods received notes yet — receive a purchase order to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <GrnDetailModal id={viewingId} onClose={() => setViewingId(null)} />
    </div>
  );
}

function GrnDetailModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data: grn } = useGoodsReceivedNote(id ?? undefined);

  return (
    <Modal open={!!id} onClose={onClose} title={grn ? `GRN #${grn.id} — PO #${grn.purchaseOrderId}` : "Goods Received Note"}>
      {!grn ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-gray-500 space-y-0.5">
            <p>Supplier: {grn.purchaseOrder?.supplier?.name ?? "-"}</p>
            <p>Received by {grn.receivedBy?.name ?? "-"} on {new Date(grn.receivedAt).toLocaleString()}</p>
            {grn.notes && <p>Notes: {grn.notes}</p>}
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-3 py-1.5">Product</th>
                  <th className="px-3 py-1.5">Received</th>
                  <th className="px-3 py-1.5">Rejected</th>
                  <th className="px-3 py-1.5">Unit Cost</th>
                  <th className="px-3 py-1.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grn.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-1.5">
                      {item.product.name}
                      {item.variant ? ` (${item.variant.value})` : ""}
                    </td>
                    <td className="px-3 py-1.5 text-green-700 font-medium">{item.quantityReceived}</td>
                    <td className="px-3 py-1.5">
                      {item.quantityRejected > 0 ? (
                        <Badge color="red">{item.quantityRejected}</Badge>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">{money(Number(item.unitCost))}</td>
                    <td className="px-3 py-1.5 text-gray-500">{item.rejectionReason ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
