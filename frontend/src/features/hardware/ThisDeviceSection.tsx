import { useState } from "react";
import { useTerminalStore } from "@/store/terminalStore";
import { Button, Card, Spinner } from "@/components/ui";
import { AssignTerminalModal } from "./AssignTerminalModal";
import { useCurrentTerminal } from "./useCurrentTerminal";
import { PrinterHealthDot } from "./PrintJobStatus";

export function ThisDeviceSection({ outletId }: { outletId: number }) {
  const { terminalId, terminal, isLoading } = useCurrentTerminal(outletId);
  const unassign = useTerminalStore((s) => s.unassign);
  const [assigning, setAssigning] = useState(false);

  if (terminalId && isLoading) {
    return (
      <Card className="p-5">
        <Spinner />
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-3">
      <h2 className="font-semibold">This device</h2>
      {terminal ? (
        <>
          <p className="text-sm">
            This device is <span className="font-semibold">{terminal.name}</span>.
          </p>
          <dl className="text-sm grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
            <dt className="text-gray-500">Receipt printer</dt>
            <dd className="flex items-center gap-2">
              {terminal.receiptPrinter ? (
                <>
                  <PrinterHealthDot lastStatus={terminal.receiptPrinter.lastStatus} />
                  {terminal.receiptPrinter.name}
                </>
              ) : (
                <span className="text-gray-400">None — receipts print through the browser</span>
              )}
            </dd>
            <dt className="text-gray-500">Cash drawer</dt>
            <dd>{terminal.cashDrawerEnabled ? "Opens on cash payments" : "Not connected"}</dd>
          </dl>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setAssigning(true)}>
              Change terminal
            </Button>
            <Button variant="ghost" onClick={() => unassign(outletId)}>
              Unassign
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            This device isn't registered as a terminal for this outlet, so receipts print through the browser's print
            dialog and there's no cash drawer.
          </p>
          <Button onClick={() => setAssigning(true)}>Set up this device</Button>
        </>
      )}
      <AssignTerminalModal open={assigning} onClose={() => setAssigning(false)} outletId={outletId} />
    </Card>
  );
}
