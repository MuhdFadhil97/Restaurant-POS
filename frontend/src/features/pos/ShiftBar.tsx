import { useState } from "react";
import { useCloseCashSession, useCurrentCashSession, useOpenCashSession } from "@/api/cashSessions";
import { getErrorMessage } from "@/api/client";
import { Button, ErrorMessage, Input, Modal } from "@/components/ui";
import { money } from "./cartMath";

export function ShiftBar({ outletId }: { outletId: string }) {
  const { data: session } = useCurrentCashSession(outletId);
  const openSession = useOpenCashSession();
  const closeSession = useCloseCashSession();
  const [modal, setModal] = useState<"open" | "close" | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setError(null);
    try {
      await openSession.mutateAsync({ outletId, openingCash: Number(amount) || 0 });
      setModal(null);
      setAmount("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleClose() {
    if (!session) return;
    setError(null);
    try {
      await closeSession.mutateAsync({ id: session.id, actualCash: Number(amount) || 0 });
      setModal(null);
      setAmount("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {session ? (
        <>
          <span className="text-gray-500">
            Shift open since {new Date(session.openedAt).toLocaleTimeString()} — opening {money(Number(session.openingCash))}
          </span>
          <button onClick={() => setModal("close")} className="text-brand-600 hover:underline">
            Close Shift
          </button>
        </>
      ) : (
        <button onClick={() => setModal("open")} className="text-brand-600 hover:underline font-medium">
          Open Shift to Start Selling
        </button>
      )}

      <Modal open={modal === "open"} onClose={() => setModal(null)} title="Open Shift">
        <div className="space-y-3">
          <Input type="number" step="0.01" placeholder="Opening cash amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {error && <ErrorMessage message={error} />}
          <Button className="w-full" onClick={handleOpen} disabled={openSession.isPending}>
            Open Shift
          </Button>
        </div>
      </Modal>

      <Modal open={modal === "close"} onClose={() => setModal(null)} title="Close Shift">
        <div className="space-y-3">
          <Input type="number" step="0.01" placeholder="Actual cash counted" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {error && <ErrorMessage message={error} />}
          <Button className="w-full" variant="danger" onClick={handleClose} disabled={closeSession.isPending}>
            Close Shift
          </Button>
        </div>
      </Modal>
    </div>
  );
}
