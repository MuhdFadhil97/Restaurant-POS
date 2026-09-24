import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { JwtPayload } from "../../lib/jwt";
import { assertOutletAccess } from "../../lib/outletAccess";
import { DisplaySnapshot, getSnapshot, setSnapshot } from "./store";
import { PublishSnapshotInput } from "./validation";

export async function publishSnapshot(terminalId: number, input: PublishSnapshotInput, user: JwtPayload | undefined) {
  const terminal = await prisma.terminal.findFirst({
    where: { id: terminalId, deletedAt: null },
    include: { outlet: { select: { name: true, receiptLogoUrl: true } } },
  });
  if (!terminal) throw ApiError.notFound("Terminal not found");
  assertOutletAccess(user, terminal.outletId);
  if (terminal.customerDisplayMode !== "REMOTE") {
    throw ApiError.badRequest("This terminal's customer display isn't set to a remote screen");
  }

  const snapshot: DisplaySnapshot = {
    outlet: terminal.outlet,
    status: input.status,
    lines: input.lines,
    totals: input.totals,
    updatedAt: new Date().toISOString(),
  };
  setSnapshot(terminalId, snapshot);
  return snapshot;
}

// Resolves a public display token to the terminal it belongs to, regardless
// of customerDisplayMode — the frontend uses the mode to decide whether to
// listen on BroadcastChannel (SAME_DEVICE) or this stream (REMOTE). Not
// outlet-access-checked — the token itself, shown only to staff who set up
// the tablet, is the credential (same pattern as the QR-order table token).
export async function resolveDisplayTerminal(token: string) {
  const terminal = await prisma.terminal.findFirst({
    where: { displayToken: token, deletedAt: null, isActive: true },
    include: { outlet: { select: { name: true, receiptLogoUrl: true } } },
  });
  if (!terminal) throw ApiError.notFound("This display link is invalid or no longer active");
  return terminal;
}

export function currentOrIdleSnapshot(terminalId: number, outlet: { name: string; receiptLogoUrl: string | null }): DisplaySnapshot {
  return (
    getSnapshot(terminalId) ?? {
      outlet,
      status: "IDLE",
      lines: [],
      totals: { subtotal: 0, discountTotal: 0, serviceChargeTotal: 0, taxTotal: 0, total: 0 },
      updatedAt: new Date().toISOString(),
    }
  );
}
