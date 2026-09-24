import { DisplaySnapshot } from "@/api/customerDisplay";

// Same-device customer display (a second monitor plugged into the till):
// BroadcastChannel reaches any other tab/window of this browser instantly,
// no backend round-trip. A REMOTE display (separate tablet) can't use this —
// it goes over SSE instead (see useCustomerDisplayPublisher / CustomerDisplayPage).
// The display page already knows the outlet from its own token lookup, so
// only the cart itself needs to cross the channel.
export type DisplayChannelMessage = Pick<DisplaySnapshot, "status" | "lines" | "totals" | "updatedAt">;

export function channelName(terminalId: number) {
  return `pos-customer-display-${terminalId}`;
}

// BroadcastChannel is unavailable in some contexts (older Safari, certain
// private-browsing modes); callers must not break when it's missing.
export function openDisplayChannel(terminalId: number): BroadcastChannel | null {
  try {
    return new BroadcastChannel(channelName(terminalId));
  } catch {
    return null;
  }
}

export function postDisplaySnapshot(channel: BroadcastChannel | null, message: DisplayChannelMessage) {
  try {
    channel?.postMessage(message);
  } catch {
    // A closed/detached channel throws on postMessage — nothing to recover.
  }
}
