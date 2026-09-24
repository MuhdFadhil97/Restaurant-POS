import { useState } from "react";
import { useCloseCashSession, useCurrentCashSession, useOpenCashSession } from "@/api/cashSessions";
import { getErrorMessage } from "@/api/client";
import { Button, ErrorMessage, Input, Modal } from "@/components/ui";
import { money } from "./cartMath";
import { useOpenDrawer } from "@/api/terminals";
import { useCurrentTerminal } from "../hardware/useCurrentTerminal";
import { PrinterHealthDot } from "../hardware/PrintJobStatus";

export function ShiftBar({ outletId }: { outletId: number }) {
  const { data: session } = useCurrentCashSession(outletId);
  const openSession = useOpenCashSession();
  const closeSession = useCloseCashSession();
  const { terminal } = useCurrentTerminal(outletId);
  const openDrawer = useOpenDrawer();
  const [modal, setModal] = useState<"open" | "close" | "drawer" | null>(null);
  const [reason, setReason] = useState("");
  const [drawerNotice, setDrawerNotice] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setError(null);
    try {
      await openSession.mutateAsync({ outletId, openingCash: Number(amount) || 0, terminalId: terminal?.id });
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

  async function handleOpenDrawer() {
    if (!terminal) return;
    setError(null);
    try {
      await openDrawer.mutateAsync({ terminalId: terminal.id, reason: reason.trim() || undefined });
      setModal(null);
      setReason("");
      setDrawerNotice(true);
      setTimeout(() => setDrawerNotice(false), 3000);
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

      {terminal && (
        <span className="ml-auto flex items-center gap-3 text-gray-500">
          {drawerNotice && <span className="text-green-600">Drawer opened</span>}
          <span className="flex items-center gap-1.5" title={terminal.receiptPrinter?.lastStatus ?? undefined}>
            {terminal.name}
            {terminal.receiptPrinter && (
              <>
                <span className="text-gray-300">·</span>
                <PrinterHealthDot lastStatus={terminal.receiptPrinter.lastStatus} />
                {terminal.receiptPrinter.name}
              </>
            )}
          </span>
          {terminal.cashDrawerEnabled && terminal.receiptPrinter && (
            <button
              onClick={() => {
                setError(null);
                setModal("drawer");
              }}
              className="text-brand-600 hover:underline"
            >
              Open Drawer
            </button>
          )}
        </span>
      )}

      <Modal open={modal === "drawer"} onClose={() => setModal(null)} title="Open Cash Drawer">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Opening the drawer without a sale is recorded in the audit log.</p>
          <Input placeholder="Reason (e.g. change for customer)" value={reason} onChange={(e) => setReason(e.target.value)} />
          {error && <ErrorMessage message={error} />}
          <Button className="w-full" onClick={handleOpenDrawer} disabled={openDrawer.isPending}>
            Open Drawer
          </Button>
        </div>
      </Modal>

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
