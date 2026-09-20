import { FormEvent, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useOutletStore } from "@/store/outletStore";
import { useCreateTable, useDeleteTable, useRegenerateTableQr, useTables, useUpdateTable } from "@/api/tables";
import { TableDto } from "@/api/types";
import { Badge, Button, Card, Input, Modal, Select } from "@/components/ui";

export function TablesTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: tables } = useTables(outletId ?? undefined);
  const createTable = useCreateTable();
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TableDto | null>(null);
  const [showingQrId, setShowingQrId] = useState<number | null>(null);
  // Re-derived from the live query (rather than a snapshot) so the modal
  // reflects a freshly regenerated token without needing to be reopened.
  const showingQr = tables?.find((t) => t.id === showingQrId) ?? null;

  async function handleDelete(table: TableDto) {
    if (!window.confirm(`Remove table "${table.name}"?`)) return;
    await deleteTable.mutateAsync(table.id);
  }

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Table</Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {tables?.map((t) => (
            <div key={t.id} className="px-3 py-2 border border-gray-200 rounded-lg flex items-center gap-2">
              <span className="text-sm font-medium">{t.name}</span>
              <span className="text-xs text-gray-400">seats {t.capacity}</span>
              <Badge
                color={
                  t.status === "AVAILABLE"
                    ? "green"
                    : t.status === "OCCUPIED"
                    ? "yellow"
                    : t.status === "RESERVED"
                    ? "blue"
                    : "red"
                }
              >
                {t.status === "NOT_AVAILABLE" ? "NOT AVAILABLE" : t.status}
              </Badge>
              <button onClick={() => setEditing(t)} className="text-xs text-brand-600 hover:underline">
                Edit
              </button>
              <button onClick={() => setShowingQrId(t.id)} className="text-xs text-brand-600 hover:underline">
                QR
              </button>
              <button onClick={() => handleDelete(t)} className="text-xs text-red-500 hover:underline">
                Delete
              </button>
            </div>
          ))}
          {tables?.length === 0 && <p className="text-sm text-gray-400">No tables configured yet.</p>}
        </div>
      </Card>

      <TableFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (input) => {
          if (!outletId) return;
          await createTable.mutateAsync({ outletId, name: input.name!, capacity: input.capacity ?? 2 });
          setShowForm(false);
        }}
        title="New Table"
      />
      <TableFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing ?? undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateTable.mutateAsync({
            id: editing.id,
            input:
              input.status === "RESERVED"
                ? input
                : { ...input, reservedFor: null, reservedAt: null, reservedPartySize: null },
          });
          setEditing(null);
        }}
        title="Edit Table"
      />

      <TableQrModal table={showingQr} onClose={() => setShowingQrId(null)} />
    </div>
  );
}

function TableQrModal({ table, onClose }: { table: TableDto | null; onClose: () => void }) {
  const regenerateQr = useRegenerateTableQr();
  const orderUrl = table?.qrToken ? `${window.location.origin}/order/${table.qrToken}` : null;

  async function handleGenerate() {
    if (!table) return;
    if (table.qrToken && !window.confirm("Regenerating invalidates the current QR code — any printed copy will stop working. Continue?")) {
      return;
    }
    await regenerateQr.mutateAsync(table.id);
  }

  return (
    <Modal open={!!table} onClose={onClose} title={table ? `QR Code — ${table.name}` : "QR Code"}>
      <div className="flex flex-col items-center gap-4">
        {orderUrl ? (
          <>
            <QRCodeSVG value={orderUrl} size={200} />
            <p className="text-xs text-gray-500 break-all text-center">{orderUrl}</p>
          </>
        ) : (
          <p className="text-sm text-gray-500">No QR code generated yet for this table.</p>
        )}
        <Button onClick={handleGenerate} disabled={regenerateQr.isPending} className="w-full">
          {table?.qrToken ? "Regenerate QR Code" : "Generate QR Code"}
        </Button>
      </div>
    </Modal>
  );
}

function TableFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name?: string;
    capacity?: number;
    status?: TableDto["status"];
    reservedFor?: string | null;
    reservedAt?: string | null;
    reservedPartySize?: number | null;
  }) => Promise<void>;
  initial?: TableDto;
  title: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [capacity, setCapacity] = useState(initial?.capacity?.toString() ?? "2");
  const [status, setStatus] = useState<TableDto["status"]>(initial?.status ?? "AVAILABLE");
  const [reservedFor, setReservedFor] = useState(initial?.reservedFor ?? "");
  const [reservedAt, setReservedAt] = useState(initial?.reservedAt ? initial.reservedAt.slice(0, 16) : "");
  const [reservedPartySize, setReservedPartySize] = useState(initial?.reservedPartySize?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Re-seed fields from `initial` whenever the modal opens — see the same
  // fix in OutletsTab.tsx / PaymentModal.tsx for why this is needed.
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setCapacity(initial?.capacity?.toString() ?? "2");
      setStatus(initial?.status ?? "AVAILABLE");
      setReservedFor(initial?.reservedFor ?? "");
      setReservedAt(initial?.reservedAt ? initial.reservedAt.slice(0, 16) : "");
      setReservedPartySize(initial?.reservedPartySize?.toString() ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        capacity: Number(capacity),
        ...(initial ? { status } : {}),
        ...(initial && status === "RESERVED"
          ? {
              reservedFor: reservedFor || null,
              reservedAt: reservedAt ? new Date(reservedAt).toISOString() : null,
              reservedPartySize: reservedPartySize ? Number(reservedPartySize) : null,
            }
          : {}),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input placeholder="Table name (e.g. T4)" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          placeholder="Capacity"
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          required
        />
        {initial && (
          <Select value={status} onChange={(e) => setStatus(e.target.value as TableDto["status"])}>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
            <option value="NOT_AVAILABLE">Not Available</option>
          </Select>
        )}
        {initial && status === "RESERVED" && (
          <>
            <Input
              placeholder="Guest name"
              value={reservedFor}
              onChange={(e) => setReservedFor(e.target.value)}
            />
            <Input type="datetime-local" value={reservedAt} onChange={(e) => setReservedAt(e.target.value)} />
            <Input
              placeholder="Party size"
              type="number"
              value={reservedPartySize}
              onChange={(e) => setReservedPartySize(e.target.value)}
            />
          </>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          Save
        </Button>
      </form>
    </Modal>
  );
}
