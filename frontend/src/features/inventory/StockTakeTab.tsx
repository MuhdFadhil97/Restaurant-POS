import { useEffect, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import {
  useCancelStockTake,
  useCompleteStockTake,
  useSaveStockTakeCounts,
  useStartStockTake,
  useStockTake,
  useStockTakes,
} from "@/api/stockTakes";
import { getErrorMessage } from "@/api/client";
import { Badge, Button, Card, ErrorMessage, Input, Modal, Spinner } from "@/components/ui";
import { StockTakeStatus } from "@/api/types";

const statusColor: Record<StockTakeStatus, "gray" | "yellow" | "blue" | "green" | "red"> = {
  IN_PROGRESS: "yellow",
  COMPLETED: "green",
  CANCELLED: "red",
};

export function StockTakeTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: stockTakes, isLoading } = useStockTakes(outletId ?? undefined);
  const startStockTake = useStartStockTake();
  const [openId, setOpenId] = useState<number | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [startNotes, setStartNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  if (openId) {
    return <StockTakeDetail id={openId} onBack={() => setOpenId(null)} />;
  }

  async function handleStart() {
    if (!outletId) return;
    setError(null);
    try {
      const created = await startStockTake.mutateAsync({ outletId, notes: startNotes || undefined });
      setShowStart(false);
      setStartNotes("");
      setOpenId(created.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowStart(true)}>+ Start New Stock Take</Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Started</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Started By</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stockTakes?.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(s.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <Badge color={statusColor[s.status]}>{s.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-2">{s._count?.items ?? s.items.length}</td>
                  <td className="px-4 py-2">{s.startedBy?.name ?? "-"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setOpenId(s.id)} className="text-brand-600 hover:underline">
                      {s.status === "IN_PROGRESS" ? "Continue" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
              {stockTakes?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No stock takes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showStart} onClose={() => setShowStart(false)} title="Start New Stock Take">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            This snapshots the current system stock quantity for every product at this outlet into a count sheet.
            Sales and adjustments made after this point won't move the target you're counting against.
          </p>
          <Input placeholder="Notes (optional)" value={startNotes} onChange={(e) => setStartNotes(e.target.value)} />
          {error && <ErrorMessage message={error} />}
          <Button className="w-full" onClick={handleStart} disabled={startStockTake.isPending}>
            {startStockTake.isPending ? "Starting..." : "Start Stock Take"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function StockTakeDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const { data: stockTake, isLoading } = useStockTake(id);
  const saveCounts = useSaveStockTakeCounts();
  const completeStockTake = useCompleteStockTake();
  const cancelStockTake = useCancelStockTake();
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stockTake) return;
    setCounts((prev) => {
      const next = { ...prev };
      for (const item of stockTake.items) {
        if (next[item.id] === undefined) next[item.id] = item.countedQuantity?.toString() ?? "";
      }
      return next;
    });
    setNotes((prev) => {
      const next = { ...prev };
      for (const item of stockTake.items) {
        if (next[item.id] === undefined) next[item.id] = item.notes ?? "";
      }
      return next;
    });
  }, [stockTake]);

  if (isLoading || !stockTake) return <Spinner />;

  const editable = stockTake.status === "IN_PROGRESS";

  async function handleSave() {
    setError(null);
    const items = Object.entries(counts)
      .filter(([, v]) => v !== "")
      .map(([itemId, v]) => ({ id: Number(itemId), countedQuantity: Number(v), notes: notes[Number(itemId)] || undefined }));
    if (items.length === 0) return;
    try {
      await saveCounts.mutateAsync({ id, items });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleComplete() {
    if (!window.confirm("Complete this stock take? Counted items will apply stock corrections immediately.")) return;
    setError(null);
    try {
      await handleSave();
      await completeStockTake.mutateAsync(id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel this stock take? No stock corrections will be applied.")) return;
    await cancelStockTake.mutateAsync(id);
    onBack();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-brand-600 hover:underline">
          &larr; Back to Stock Takes
        </button>
        <Badge color={statusColor[stockTake.status]}>{stockTake.status.replace("_", " ")}</Badge>
      </div>

      {error && <ErrorMessage message={error} />}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">System Qty</th>
              <th className="px-4 py-2">Counted Qty</th>
              <th className="px-4 py-2">Variance</th>
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stockTake.items.map((item) => {
              const countedValue = counts[item.id] ?? "";
              const variance = countedValue !== "" ? Number(countedValue) - item.systemQuantity : null;
              return (
                <tr key={item.id}>
                  <td className="px-4 py-2">
                    {item.product.name}
                    {item.variant ? ` (${item.variant.value})` : ""}
                  </td>
                  <td className="px-4 py-2">{item.systemQuantity}</td>
                  <td className="px-4 py-2">
                    {editable ? (
                      <Input
                        type="number"
                        className="w-24"
                        value={countedValue}
                        onChange={(e) => setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                    ) : (
                      item.countedQuantity ?? "-"
                    )}
                  </td>
                  <td className={`px-4 py-2 font-medium ${variance ? (variance < 0 ? "text-red-600" : "text-green-700") : "text-gray-400"}`}>
                    {variance !== null ? (variance > 0 ? `+${variance}` : variance) : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {editable ? (
                      <Input
                        className="w-40"
                        value={notes[item.id] ?? ""}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                    ) : (
                      item.notes ?? "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {editable && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel} disabled={cancelStockTake.isPending}>
            Cancel Stock Take
          </Button>
          <Button variant="secondary" onClick={handleSave} disabled={saveCounts.isPending}>
            {saveCounts.isPending ? "Saving..." : "Save Progress"}
          </Button>
          <Button onClick={handleComplete} disabled={completeStockTake.isPending}>
            {completeStockTake.isPending ? "Completing..." : "Complete Stock Take"}
          </Button>
        </div>
      )}
    </div>
  );
}
