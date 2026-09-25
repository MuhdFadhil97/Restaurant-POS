import { FormEvent, useEffect, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useTables } from "@/api/tables";
import {
  useCancelReservation,
  useCompleteReservation,
  useConfirmReservation,
  useCreateReservation,
  useMarkNoShow,
  useReservations,
  useSeatReservation,
} from "@/api/reservations";
import { Reservation, ReservationStatus } from "@/api/types";
import { Badge, Button, Card, ErrorMessage, Input, Modal, Select, Spinner } from "@/components/ui";
import { getErrorMessage } from "@/api/client";

const STATUS_COLOR: Record<ReservationStatus, "gray" | "green" | "red" | "yellow" | "blue" | "purple"> = {
  PENDING: "yellow",
  CONFIRMED: "blue",
  SEATED: "green",
  COMPLETED: "gray",
  CANCELLED: "red",
  NO_SHOW: "red",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ReservationsPage() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [showForm, setShowForm] = useState(false);
  const { data: reservations, isLoading, error } = useReservations({
    outletId: outletId ?? 0,
    dateFrom,
    dateTo,
  });
  const { data: tables } = useTables(outletId ?? undefined);

  const confirmReservation = useConfirmReservation();
  const seatReservation = useSeatReservation();
  const completeReservation = useCompleteReservation();
  const cancelReservation = useCancelReservation();
  const markNoShow = useMarkNoShow();

  const [seatingId, setSeatingId] = useState<number | null>(null);

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  async function handleCancel(reservation: Reservation) {
    const reason = window.prompt(`Cancel reservation for ${reservation.customerName}? Reason (optional):`);
    if (reason === null) return;
    await cancelReservation.mutateAsync({ id: reservation.id, reason: reason || undefined });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reservations</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          <span className="text-sm text-gray-400">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
          <Button onClick={() => setShowForm(true)}>+ New Reservation</Button>
        </div>
      </div>

      {error && <ErrorMessage message={getErrorMessage(error)} />}
      {isLoading ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Guest</th>
                <th className="px-4 py-2">Date &amp; Time</th>
                <th className="px-4 py-2">Party</th>
                <th className="px-4 py-2">Table</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservations?.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.customerName}</span>
                      {r.source !== "STAFF" && <Badge color="purple">{r.source}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(r.reservedFor).toLocaleString()}</td>
                  <td className="px-4 py-2">{r.partySize}</td>
                  <td className="px-4 py-2">{r.table?.name ?? "-"}</td>
                  <td className="px-4 py-2">{r.phone ?? "-"}</td>
                  <td className="px-4 py-2">
                    <Badge color={STATUS_COLOR[r.status]}>{r.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-2 max-w-[16rem] truncate text-xs text-gray-400">{r.notes ?? "-"}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
                    {r.status === "PENDING" && (
                      <Button
                        variant="secondary"
                        onClick={() => confirmReservation.mutateAsync({ id: r.id })}
                        disabled={confirmReservation.isPending}
                      >
                        Confirm
                      </Button>
                    )}
                    {r.status === "CONFIRMED" && (
                      <>
                        <Button variant="secondary" onClick={() => setSeatingId(r.id)}>
                          Seat
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => markNoShow.mutateAsync(r.id)}
                          disabled={markNoShow.isPending}
                        >
                          No-show
                        </Button>
                      </>
                    )}
                    {r.status === "SEATED" && (
                      <Button
                        variant="secondary"
                        onClick={() => completeReservation.mutateAsync(r.id)}
                        disabled={completeReservation.isPending}
                      >
                        Complete
                      </Button>
                    )}
                    {(r.status === "PENDING" || r.status === "CONFIRMED") && (
                      <Button variant="danger" onClick={() => handleCancel(r)} disabled={cancelReservation.isPending}>
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {reservations?.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No reservations for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      <NewReservationModal open={showForm} onClose={() => setShowForm(false)} outletId={outletId} />
      <SeatReservationModal
        reservationId={seatingId}
        tables={tables ?? []}
        onClose={() => setSeatingId(null)}
      />
    </div>
  );
}

function SeatReservationModal({
  reservationId,
  tables,
  onClose,
}: {
  reservationId: number | null;
  tables: { id: number; name: string; status: string }[];
  onClose: () => void;
}) {
  const seatReservation = useSeatReservation();
  const [tableId, setTableId] = useState("");
  const availableTables = tables.filter((t) => t.status === "AVAILABLE" || t.status === "RESERVED");

  useEffect(() => {
    if (reservationId) setTableId("");
  }, [reservationId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reservationId || !tableId) return;
    await seatReservation.mutateAsync({ id: reservationId, tableId: Number(tableId) });
    onClose();
  }

  return (
    <Modal open={!!reservationId} onClose={onClose} title="Seat Reservation">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Table</label>
          <Select value={tableId} onChange={(e) => setTableId(e.target.value)} required>
            <option value="" disabled>
              Choose a table&hellip;
            </option>
            {availableTables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" className="w-full" disabled={seatReservation.isPending || !tableId}>
          Seat
        </Button>
      </form>
    </Modal>
  );
}

function NewReservationModal({ open, onClose, outletId }: { open: boolean; onClose: () => void; outletId: number }) {
  const createReservation = useCreateReservation();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [reservedFor, setReservedFor] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCustomerName("");
      setPhone("");
      setPartySize("2");
      setReservedFor("");
      setNotes("");
      setFormError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await createReservation.mutateAsync({
        outletId,
        customerName,
        phone: phone || undefined,
        partySize: Number(partySize),
        reservedFor: new Date(reservedFor).toISOString(),
        notes: notes || undefined,
      });
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Reservation">
      <form onSubmit={handleSubmit} className="space-y-3">
        {formError && <ErrorMessage message={formError} />}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Guest name</label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Phone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Party size</label>
          <Input type="number" min={1} value={partySize} onChange={(e) => setPartySize(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date &amp; time</label>
          <Input type="datetime-local" value={reservedFor} onChange={(e) => setReservedFor(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          Save
        </Button>
      </form>
    </Modal>
  );
}
