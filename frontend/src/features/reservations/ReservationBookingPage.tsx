import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { useCreatePublicReservation } from "@/api/reservations";
import { getErrorMessage } from "@/api/client";
import { ErrorMessage } from "@/components/ui";

export function ReservationBookingPage() {
  const { outletId = "" } = useParams();
  const createReservation = useCreatePublicReservation(Number(outletId));

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [reservedFor, setReservedFor] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createReservation.mutateAsync({
      customerName,
      phone,
      partySize: Number(partySize),
      reservedFor: new Date(reservedFor).toISOString(),
      notes: notes || undefined,
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-sm w-full text-center space-y-2">
          <h1 className="text-lg font-semibold text-gray-900">Request received</h1>
          <p className="text-sm text-gray-500">
            Thanks, {customerName}. We&rsquo;ll contact you at {phone} to confirm your table for{" "}
            {new Date(reservedFor).toLocaleString()}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <p className="font-semibold text-gray-900">Reserve a table</p>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-3 max-w-sm mx-auto">
        {createReservation.isError && <ErrorMessage message={getErrorMessage(createReservation.error)} />}
        <input
          placeholder="Your name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="number"
          min={1}
          placeholder="Party size"
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="datetime-local"
          value={reservedFor}
          onChange={(e) => setReservedFor(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={createReservation.isPending}
          className="w-full bg-brand-600 text-white font-medium py-3 rounded-lg disabled:bg-gray-300"
        >
          Request reservation
        </button>
      </form>
    </div>
  );
}
