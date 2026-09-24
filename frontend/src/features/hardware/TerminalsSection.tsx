import { FormEvent, useEffect, useState } from "react";
import { TerminalInput, useCreateTerminal, useDeleteTerminal, useTerminals, useUpdateTerminal } from "@/api/terminals";
import { usePrinters } from "@/api/printers";
import { getErrorMessage } from "@/api/client";
import { TerminalDto } from "@/api/types";
import { useTerminalStore } from "@/store/terminalStore";
import { Badge, Button, Card, ErrorMessage, Input, Modal, Select } from "@/components/ui";
import { isOnline } from "./useCurrentTerminal";

export function TerminalsSection({ outletId }: { outletId: number }) {
  const { data: terminals } = useTerminals(outletId);
  const createTerminal = useCreateTerminal();
  const updateTerminal = useUpdateTerminal();
  const deleteTerminal = useDeleteTerminal();
  const currentId = useTerminalStore((s) => s.terminalByOutlet[outletId]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TerminalDto | null>(null);

  async function handleDelete(t: TerminalDto) {
    if (!window.confirm(`Remove terminal "${t.name}"? Devices set up as this terminal will need to be set up again.`)) return;
    await deleteTerminal.mutateAsync(t.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Terminal</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Receipt printer</th>
              <th className="px-4 py-2 font-medium">Cash drawer</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {terminals?.map((t) => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium">
                  {t.name} {t.id === currentId && <Badge color="blue">This device</Badge>}
                </td>
                <td className="px-4 py-2">
                  {!t.isActive ? (
                    <Badge color="gray">Disabled</Badge>
                  ) : isOnline(t.lastSeenAt) ? (
                    <Badge color="green">Online</Badge>
                  ) : (
                    <span className="text-gray-400">
                      {t.lastSeenAt ? `Last seen ${new Date(t.lastSeenAt).toLocaleString()}` : "Never connected"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">{t.receiptPrinter?.name ?? <span className="text-gray-400">Browser print</span>}</td>
                <td className="px-4 py-2">{t.cashDrawerEnabled ? "Yes" : "—"}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap space-x-3">
                  <button onClick={() => setEditing(t)} className="text-xs text-brand-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(t)} className="text-xs text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {terminals?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No terminals yet. Add one for each till or tablet that takes orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <TerminalFormModal
        open={showForm}
        outletId={outletId}
        title="New Terminal"
        onClose={() => setShowForm(false)}
        onSubmit={async (input) => {
          await createTerminal.mutateAsync({ ...input, outletId, name: input.name! });
          setShowForm(false);
        }}
      />
      <TerminalFormModal
        open={!!editing}
        outletId={outletId}
        initial={editing ?? undefined}
        title="Edit Terminal"
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateTerminal.mutateAsync({ id: editing.id, input });
          setEditing(null);
        }}
      />
    </div>
  );
}

function TerminalFormModal({
  open,
  outletId,
  initial,
  title,
  onClose,
  onSubmit,
}: {
  open: boolean;
  outletId: number;
  initial?: TerminalDto;
  title: string;
  onClose: () => void;
  onSubmit: (input: TerminalInput) => Promise<void>;
}) {
  const { data: printers } = usePrinters(open ? outletId : undefined);
  const [name, setName] = useState("");
  const [receiptPrinterId, setReceiptPrinterId] = useState("");
  const [cashDrawerEnabled, setCashDrawerEnabled] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Re-seed on open — the edit instance stays mounted between rows (see TablesTab.tsx).
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setReceiptPrinterId(initial?.receiptPrinterId?.toString() ?? "");
      setCashDrawerEnabled(initial?.cashDrawerEnabled ?? false);
      setIsActive(initial?.isActive ?? true);
      setError(null);
    }
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name,
        receiptPrinterId: receiptPrinterId ? Number(receiptPrinterId) : null,
        // The drawer is driven through the receipt printer's kick port.
        cashDrawerEnabled: !!receiptPrinterId && cashDrawerEnabled,
        ...(initial ? { isActive } : {}),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const usable = printers?.filter((p) => p.isActive) ?? [];

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-gray-600">Name</span>
          <Input placeholder="e.g. Counter 1" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Receipt printer</span>
          <Select value={receiptPrinterId} onChange={(e) => setReceiptPrinterId(e.target.value)}>
            <option value="">None (print through the browser)</option>
            {usable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </label>
        <label className={`flex items-center gap-2 text-sm ${receiptPrinterId ? "" : "opacity-50"}`}>
          <input
            type="checkbox"
            checked={cashDrawerEnabled && !!receiptPrinterId}
            disabled={!receiptPrinterId}
            onChange={(e) => setCashDrawerEnabled(e.target.checked)}
          />
          Cash drawer is connected to this receipt printer
        </label>
        {initial && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}
        {error && <ErrorMessage message={error} />}
        <Button type="submit" className="w-full" disabled={submitting}>
          Save
        </Button>
      </form>
    </Modal>
  );
}
