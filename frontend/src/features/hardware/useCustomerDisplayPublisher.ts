import { useEffect, useRef } from "react";
import { DisplaySnapshot, publishRemoteSnapshot } from "@/api/customerDisplay";
import { TerminalDto } from "@/api/types";
import { openDisplayChannel, postDisplaySnapshot } from "./customerDisplayChannel";

export type DisplayCart = Pick<DisplaySnapshot, "status" | "lines" | "totals">;

const REMOTE_PUBLISH_DEBOUNCE_MS = 400;

// Publishes the live cart to this terminal's customer display, whichever kind
// it is: BroadcastChannel for a second monitor on the same machine, or a
// debounced PUT (relayed to the display over SSE) for a separate tablet.
// A no-op when the terminal has no display or isn't known yet.
export function useCustomerDisplayPublisher(terminal: TerminalDto | null, cart: DisplayCart) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastSentRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (terminal?.customerDisplayMode !== "SAME_DEVICE") return;
    const channel = openDisplayChannel(terminal.id);
    channelRef.current = channel;
    return () => {
      channel?.close();
      channelRef.current = null;
    };
  }, [terminal?.id, terminal?.customerDisplayMode]);

  useEffect(() => {
    if (!terminal || terminal.customerDisplayMode === "NONE") return;
    // Cheap re-renders (e.g. other polling queries) shouldn't re-publish
    // identical content, especially over the network for REMOTE displays.
    const key = JSON.stringify(cart);
    if (key === lastSentRef.current) return;
    lastSentRef.current = key;

    if (terminal.customerDisplayMode === "SAME_DEVICE") {
      postDisplaySnapshot(channelRef.current, { ...cart, updatedAt: new Date().toISOString() });
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      publishRemoteSnapshot(terminal.id, cart).catch(() => {
        // Best-effort: a display update failing shouldn't interrupt the sale.
      });
    }, REMOTE_PUBLISH_DEBOUNCE_MS);
  }, [terminal?.id, terminal?.customerDisplayMode, cart]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );
}
