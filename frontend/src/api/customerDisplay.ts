import { apiClient } from "./client";

export interface DisplaySnapshotLine {
  name: string;
  variantLabel?: string;
  quantity: number;
  lineTotal: number;
}

export interface DisplaySnapshotTotals {
  subtotal: number;
  discountTotal: number;
  serviceChargeTotal: number;
  taxTotal: number;
  total: number;
}

export interface DisplaySnapshot {
  outlet: { name: string; receiptLogoUrl: string | null };
  status: "CART" | "PAID" | "IDLE";
  lines: DisplaySnapshotLine[];
  totals: DisplaySnapshotTotals;
  updatedAt: string;
}

// REMOTE mode only — a tablet elsewhere reads this over SSE at /display/:token.
export async function publishRemoteSnapshot(
  terminalId: number,
  snapshot: Pick<DisplaySnapshot, "status" | "lines" | "totals">
) {
  await apiClient.put(`/customer-display/${terminalId}`, snapshot);
}
