import { useEffect } from "react";
import axios from "axios";
import { sendTerminalHeartbeat, useTerminal } from "@/api/terminals";
import { useTerminalStore } from "@/store/terminalStore";

// The Terminal this device is registered as for the given outlet, if any.
export function useCurrentTerminal(outletId: number | null | undefined) {
  const terminalId = useTerminalStore((s) => (outletId ? s.terminalByOutlet[outletId] : undefined));
  const dismissed = useTerminalStore((s) => (outletId ? s.dismissedOutlets.includes(outletId) : false));
  const unassign = useTerminalStore((s) => s.unassign);
  const query = useTerminal(terminalId);

  // The terminal was deleted (or this device's localStorage points at a stale
  // id) — forget it so the device can be assigned again.
  useEffect(() => {
    if (outletId && axios.isAxiosError(query.error) && query.error.response?.status === 404) {
      unassign(outletId);
    }
  }, [query.error, outletId, unassign]);

  return { terminalId, terminal: query.data ?? null, dismissed, isLoading: query.isLoading };
}

const HEARTBEAT_MS = 60_000;

// Keeps Terminal.lastSeenAt fresh so the Hardware tab can show which devices
// are online. Mount once, on the POS screen.
export function useTerminalHeartbeat(terminalId: number | undefined) {
  useEffect(() => {
    if (!terminalId) return;
    const beat = () => void sendTerminalHeartbeat(terminalId).catch(() => {});
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [terminalId]);
}

export function isOnline(lastSeenAt: string | null) {
  return !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < HEARTBEAT_MS * 2.5;
}
