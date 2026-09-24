import { PrintJobKind, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";

type Tx = PrismaClient | Prisma.TransactionClient;

export const MAX_ATTEMPTS = 3;
// A job claimed but never acked (bridge/terminal crashed mid-print) goes back
// to PENDING after this long.
export const STALE_CLAIM_MS = 60_000;

// Columns safe to return to clients — everything except the payload bytes.
export const printJobSummarySelect = {
  id: true,
  outletId: true,
  printerId: true,
  kind: true,
  status: true,
  attempts: true,
  lastError: true,
  transactionId: true,
  createdById: true,
  claimedAt: true,
  printedAt: true,
  createdAt: true,
  printer: { select: { id: true, name: true, connection: true } },
} satisfies Prisma.PrintJobSelect;

let onEnqueue: (() => void) | undefined;
// The dispatcher registers here so direct-network jobs go out immediately
// instead of waiting for its next poll tick.
export function setEnqueueListener(listener: () => void) {
  onEnqueue = listener;
}

// For code that makes a job PENDING without going through enqueue() (retry).
export function notifyQueueChanged() {
  onEnqueue?.();
}

export async function enqueue(
  params: {
    outletId: number;
    printerId: number;
    kind: PrintJobKind;
    payload: Buffer;
    transactionId?: number | null;
    createdById?: number | null;
  },
  tx: Tx = prisma
) {
  const job = await tx.printJob.create({
    data: {
      outletId: params.outletId,
      printerId: params.printerId,
      kind: params.kind,
      payload: params.payload,
      transactionId: params.transactionId ?? null,
      createdById: params.createdById ?? null,
    },
    select: printJobSummarySelect,
  });
  onEnqueue?.();
  return job;
}

// Atomically takes a PENDING job. Returns false if someone else got it first,
// so two bridges/terminals/dispatcher ticks can never print the same job twice.
export async function claim(jobId: number): Promise<boolean> {
  const { count } = await prisma.printJob.updateMany({
    where: { id: jobId, status: "PENDING" },
    data: { status: "CLAIMED", claimedAt: new Date() },
  });
  return count === 1;
}

// Claims up to `limit` pending jobs across the given printers, oldest first,
// and returns them with their payload for delivery.
export async function claimPending(printerIds: number[], limit = 10) {
  if (printerIds.length === 0) return [];
  const candidates = await prisma.printJob.findMany({
    where: { printerId: { in: printerIds }, status: "PENDING" },
    orderBy: { id: "asc" },
    take: limit,
    select: { id: true },
  });
  const claimed = [];
  for (const { id } of candidates) {
    if (await claim(id)) claimed.push(id);
  }
  if (claimed.length === 0) return [];
  return prisma.printJob.findMany({
    where: { id: { in: claimed } },
    orderBy: { id: "asc" },
    include: { printer: true },
  });
}

// Reports the outcome of a claimed job. Failures go back to PENDING for
// another try until MAX_ATTEMPTS, then stay FAILED until someone hits Retry.
export async function ack(jobId: number, result: { ok: true } | { ok: false; error: string }) {
  const job = await prisma.printJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "CLAIMED") return null;

  const now = new Date();
  if (result.ok) {
    await prisma.printer.update({ where: { id: job.printerId }, data: { lastStatus: "OK", lastSeenAt: now } });
    return prisma.printJob.update({
      where: { id: jobId },
      data: { status: "PRINTED", printedAt: now, attempts: job.attempts + 1, lastError: null },
      select: printJobSummarySelect,
    });
  }

  const attempts = job.attempts + 1;
  await prisma.printer.update({ where: { id: job.printerId }, data: { lastStatus: result.error } });
  return prisma.printJob.update({
    where: { id: jobId },
    data: {
      status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
      attempts,
      lastError: result.error,
      claimedAt: null,
    },
    select: printJobSummarySelect,
  });
}

export async function requeueStale() {
  const cutoff = new Date(Date.now() - STALE_CLAIM_MS);
  const stale = await prisma.printJob.findMany({
    where: { status: "CLAIMED", claimedAt: { lt: cutoff } },
    select: { id: true },
  });
  for (const { id } of stale) {
    await ack(id, { ok: false, error: "Printer did not confirm the job in time" });
  }
}
