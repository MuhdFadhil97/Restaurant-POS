import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { hashBridgeToken } from "../../middleware/bridgeAuth";
import { ack, claimPending } from "../../lib/printing/queue";
import { AckJobInput } from "./validation";

function newBridgeToken() {
  // Prefixed so a leaked/logged value is recognizable at a glance, same idea
  // as Stripe/GitHub-style API keys.
  return `pbk_${crypto.randomBytes(24).toString("base64url")}`;
}

// ── Admin-facing CRUD ───────────────────────────────────────────────────

export async function listBridges(outletId: number) {
  return prisma.printBridge.findMany({
    where: { outletId, deletedAt: null },
    select: { id: true, outletId: true, name: true, lastSeenAt: true, createdAt: true },
    orderBy: { name: "asc" },
  });
}

export async function createBridge(input: { outletId: number; name: string }) {
  const token = newBridgeToken();
  const bridge = await prisma.printBridge.create({
    data: { outletId: input.outletId, name: input.name, tokenHash: hashBridgeToken(token) },
    select: { id: true, outletId: true, name: true, lastSeenAt: true, createdAt: true },
  });
  // The only time the plaintext token is ever available — shown once.
  return { ...bridge, token };
}

async function findBridge(id: number) {
  const bridge = await prisma.printBridge.findFirst({ where: { id, deletedAt: null } });
  if (!bridge) throw ApiError.notFound("Print bridge not found");
  return bridge;
}

export async function updateBridge(id: number, input: { name?: string }) {
  await findBridge(id);
  return prisma.printBridge.update({
    where: { id },
    data: input,
    select: { id: true, outletId: true, name: true, lastSeenAt: true, createdAt: true },
  });
}

export async function regenerateBridgeToken(id: number) {
  await findBridge(id);
  const token = newBridgeToken();
  const bridge = await prisma.printBridge.update({
    where: { id },
    data: { tokenHash: hashBridgeToken(token) },
    select: { id: true, outletId: true, name: true, lastSeenAt: true, createdAt: true },
  });
  return { ...bridge, token };
}

export async function deleteBridge(id: number) {
  await findBridge(id);
  await prisma.$transaction([
    // A printer that loses its bridge can't be reached any more.
    prisma.printer.updateMany({ where: { bridgeId: id }, data: { isActive: false } }),
    prisma.printBridge.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
}

// ── Agent-facing: claim/ack, scoped to this bridge's own printers ────────

export async function claimJobsForBridge(bridgeId: number, limit = 10) {
  const printers = await prisma.printer.findMany({
    where: { bridgeId, connection: "NETWORK_BRIDGE", deletedAt: null, isActive: true },
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
    host: job.printer.host,
    port: job.printer.port,
    payload: Buffer.from(job.payload).toString("base64"),
  }));
}

export async function ackJobForBridge(bridgeId: number, jobId: number, input: AckJobInput) {
  const job = await prisma.printJob.findUnique({ where: { id: jobId }, include: { printer: true } });
  if (!job || job.printer.bridgeId !== bridgeId) {
    // Deliberately 404 rather than 403 — don't confirm the job id exists at all.
    throw ApiError.notFound("Print job not found");
  }
  const updated = input.ok ? await ack(jobId, { ok: true }) : await ack(jobId, { ok: false, error: input.error ?? "Bridge reported failure" });
  if (!updated) throw ApiError.conflict("Job was already claimed by something else");
  return updated;
}
