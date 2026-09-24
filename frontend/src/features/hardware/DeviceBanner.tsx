import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useTerminalStore } from "@/store/terminalStore";
import { AssignTerminalModal } from "./AssignTerminalModal";
import { useCurrentTerminal, useTerminalHeartbeat } from "./useCurrentTerminal";

// Shown on the POS screen until this device is registered as a terminal (or
// someone chooses to keep using browser printing). Also runs the heartbeat.
export function DeviceBanner({ outletId }: { outletId: number }) {
  const role = useAuthStore((s) => s.user?.role);
  const dismiss = useTerminalStore((s) => s.dismiss);
  const { terminalId, terminal, dismissed, isLoading } = useCurrentTerminal(outletId);
  const [assigning, setAssigning] = useState(false);
  useTerminalHeartbeat(terminal ? terminalId : undefined);

  if (terminal || dismissed || (terminalId && isLoading)) return null;
  const canAssign = role === "ADMIN" || role === "MANAGER";

  return (
    <div className="flex items-center justify-between gap-3 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-2">
      <span>
        This device isn't set up as a terminal, so receipts print through the browser.
        {!canAssign && " Ask a manager to set it up."}
      </span>
      {canAssign && (
        <span className="flex gap-3 whitespace-nowrap">
          <button onClick={() => setAssigning(true)} className="font-medium text-amber-900 underline">
            Set up
          </button>
          <button onClick={() => dismiss(outletId)} className="text-amber-700 hover:underline">
            Keep browser printing
          </button>
        </span>
      )}
      <AssignTerminalModal open={assigning} onClose={() => setAssigning(false)} outletId={outletId} />
    </div>
  );
}
