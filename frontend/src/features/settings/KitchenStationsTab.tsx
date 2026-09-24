import { FormEvent, useEffect, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import {
  useCreateKitchenStation,
  useDeleteKitchenStation,
  useKitchenStations,
  useUpdateKitchenStation,
} from "@/api/kitchenStations";
import { usePrinters } from "@/api/printers";
import { getErrorMessage } from "@/api/client";
import { KitchenStation } from "@/api/types";
import { Button, Card, ErrorMessage, Input, Modal, Select } from "@/components/ui";
import { PrinterHealthDot } from "../hardware/PrintJobStatus";

export function KitchenStationsTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: stations } = useKitchenStations(outletId ?? undefined);
  const createStation = useCreateKitchenStation();
  const updateStation = useUpdateKitchenStation();
  const deleteStation = useDeleteKitchenStation();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KitchenStation | null>(null);

  async function handleDelete(station: KitchenStation) {
    if (!window.confirm(`Remove station "${station.name}"? Products routed to it will show under "All Stations" on the KDS.`)) {
      return;
    }
    await deleteStation.mutateAsync(station.id);
  }

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Station</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Station</th>
              <th className="px-4 py-2 font-medium">Ticket printer</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {stations?.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium">{s.name}</td>
                <td className="px-4 py-2">
                  {s.printer ? (
                    <span className="inline-flex items-center gap-2">
                      <PrinterHealthDot lastStatus={s.printer.lastStatus} />
                      {s.printer.name}
                    </span>
                  ) : (
                    <span className="text-gray-400">None — Kitchen Display only</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap space-x-3">
                  <button onClick={() => setEditing(s)} className="text-xs text-brand-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(s)} className="text-xs text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {stations?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No kitchen stations yet. Add one per prep area (e.g. Kitchen, Bar).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <StationFormModal
        open={showForm}
        outletId={outletId}
        title="New Station"
        onClose={() => setShowForm(false)}
        onSubmit={async (input) => {
          await createStation.mutateAsync({ outletId, ...input });
          setShowForm(false);
        }}
      />
      <StationFormModal
        open={!!editing}
        outletId={outletId}
        initial={editing ?? undefined}
        title="Edit Station"
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateStation.mutateAsync({ id: editing.id, input });
          setEditing(null);
        }}
      />
    </div>
  );
}

function StationFormModal({
  open,
  outletId,
  initial,
  title,
  onClose,
  onSubmit,
}: {
  open: boolean;
  outletId: number;
  initial?: KitchenStation;
  title: string;
  onClose: () => void;
  onSubmit: (input: { name: string; printerId: number | null }) => Promise<void>;
}) {
  const { data: printers } = usePrinters(open ? outletId : undefined);
  const [name, setName] = useState("");
  const [printerId, setPrinterId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Re-seed on open — the edit instance stays mounted between rows (see TablesTab.tsx).
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setPrinterId(initial?.printerId?.toString() ?? "");
      setError(null);
    }
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name, printerId: printerId ? Number(printerId) : null });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-gray-600">Name</span>
          <Input placeholder="e.g. Kitchen, Bar" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Ticket printer</span>
          <Select value={printerId} onChange={(e) => setPrinterId(e.target.value)}>
            <option value="">None (Kitchen Display only)</option>
            {printers
              ?.filter((p) => p.isActive)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </label>
        <p className="text-xs text-gray-500">
          Products are routed to a station from the product form. Orders print here when they're sent to the kitchen.
        </p>
        {error && <ErrorMessage message={error} />}
        <Button type="submit" className="w-full" disabled={submitting}>
          Save
        </Button>
      </form>
    </Modal>
  );
}
