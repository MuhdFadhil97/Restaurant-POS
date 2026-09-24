import { EventEmitter } from "events";

// A customer-display snapshot is small, ephemeral, per-terminal state (what's
// currently in the cart) — not a durable record, so it lives in memory rather
// than a table. It only needs to survive as long as the backend process does;
// a restart just means the display goes blank until the next cart change.
export interface DisplaySnapshot {
  outlet: { name: string; receiptLogoUrl: string | null };
  status: "CART" | "PAID" | "IDLE";
  lines: { name: string; variantLabel?: string; quantity: number; lineTotal: number }[];
  totals: { subtotal: number; discountTotal: number; serviceChargeTotal: number; taxTotal: number; total: number };
  updatedAt: string;
}

const snapshots = new Map<number, DisplaySnapshot>();
const bus = new EventEmitter();
bus.setMaxListeners(0); // many terminals' displays can be open at once

export function setSnapshot(terminalId: number, snapshot: DisplaySnapshot) {
  snapshots.set(terminalId, snapshot);
  bus.emit(`terminal:${terminalId}`, snapshot);
}

export function getSnapshot(terminalId: number): DisplaySnapshot | undefined {
  return snapshots.get(terminalId);
}

export function onSnapshot(terminalId: number, listener: (s: DisplaySnapshot) => void) {
  bus.on(`terminal:${terminalId}`, listener);
  return () => bus.off(`terminal:${terminalId}`, listener);
}
