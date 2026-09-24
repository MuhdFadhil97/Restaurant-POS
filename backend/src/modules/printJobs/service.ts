import { PrintJobStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { JwtPayload } from "../../lib/jwt";
import { assertOutletAccess } from "../../lib/outletAccess";
import { ack, claimPending, notifyQueueChanged, printJobSummarySelect } from "../../lib/printing/queue";
import { AckTerminalJobInput } from "./validation";

export async function listPrintJobs(query: { outletId: number; status?: PrintJobStatus; limit?: number }) {
  return prisma.printJob.findMany({
    where: { outletId: query.outletId, status: query.status },
    select: printJobSummarySelect,
    orderBy: { id: "desc" },
    take: Math.min(query.limit ?? 50, 200),
  });
}

async function findJob(id: number, user: JwtPayload | undefined) {
  const job = await prisma.printJob.findUnique({ where: { id }, select: printJobSummarySelect });
  if (!job) throw ApiError.notFound("Print job not found");
  assertOutletAccess(user, job.outletId);
  return job;
}

export async function getPrintJob(id: number, user: JwtPayload | undefined) {
  return findJob(id, user);
}

export async function retryPrintJob(id: number, user: JwtPayload | undefined) {
  const job = await findJob(id, user);
  if (job.status !== "FAILED") throw ApiError.conflict("Only failed jobs can be retried");
  const updated = await prisma.printJob.update({
    where: { id },
    data: { status: "PENDING", attempts: 0, lastError: null, claimedAt: null },
    select: printJobSummarySelect,
  });
  notifyQueueChanged();
  return updated;
}

// ── Terminal-local (USB/Bluetooth): the terminal's own browser claims jobs
// for printers physically attached to it, rather than a bridge or the
// backend's own dispatcher reaching them over the network. Auth is the
// staff member's JWT (the same session running the POS), not a bridge token.

export async function claimJobsForTerminal(terminalId: number, user: JwtPayload | undefined, limit = 10) {
  const terminal = await prisma.terminal.findFirst({ where: { id: terminalId, deletedAt: null } });
  if (!terminal) throw ApiError.notFound("Terminal not found");
  assertOutletAccess(user, terminal.outletId);

  const printers = await prisma.printer.findMany({
    where: { terminalId, connection: "TERMINAL_LOCAL", deletedAt: null, isActive: true },
    select: { id: true },
  });
  const jobs = await claimPending(
    printers.map((p) => p.id),
    limit
  );
  return jobs.map((job) => ({
    id: job.id,
    kind: job.kind,
    printerId: job.printerId,
    payload: Buffer.from(job.payload).toString("base64"),
  }));
}

export async function ackTerminalJob(id: number, user: JwtPayload | undefined, input: AckTerminalJobInput) {
  const job = await prisma.printJob.findUnique({ where: { id }, include: { printer: true } });
  if (!job) throw ApiError.notFound("Print job not found");
  assertOutletAccess(user, job.outletId);
  if (job.printer.connection !== "TERMINAL_LOCAL") {
    throw ApiError.badRequest("This job isn't a terminal-local print");
  }
  const updated = input.ok
    ? await ack(id, { ok: true })
    : await ack(id, { ok: false, error: input.error ?? "Terminal reported failure" });
  if (!updated) throw ApiError.conflict("Job was already claimed by something else");
  return updated;
}
