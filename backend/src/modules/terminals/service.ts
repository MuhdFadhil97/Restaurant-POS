import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { JwtPayload } from "../../lib/jwt";
import { assertOutletAccess } from "../../lib/outletAccess";
import { CreateTerminalInput, UpdateTerminalInput } from "./validation";

const include = {
  receiptPrinter: { select: { id: true, name: true, connection: true, lastStatus: true } },
};

function newDisplayToken() {
  return crypto.randomBytes(18).toString("base64url");
}

async function findTerminal(id: number, user: JwtPayload | undefined) {
  const terminal = await prisma.terminal.findFirst({ where: { id, deletedAt: null }, include });
  if (!terminal) throw ApiError.notFound("Terminal not found");
  assertOutletAccess(user, terminal.outletId);
  return terminal;
}

async function assertReceiptPrinter(outletId: number, printerId: number | null | undefined) {
  if (printerId == null) return;
  const printer = await prisma.printer.findFirst({ where: { id: printerId, outletId, deletedAt: null } });
  if (!printer) throw ApiError.badRequest("Receipt printer must belong to the same outlet");
}

export async function listTerminals(outletId: number) {
  return prisma.terminal.findMany({
    where: { outletId, deletedAt: null },
    include,
    orderBy: { name: "asc" },
  });
}

export async function getTerminal(id: number, user: JwtPayload | undefined) {
  return findTerminal(id, user);
}

export async function createTerminal(input: CreateTerminalInput) {
  await assertReceiptPrinter(input.outletId, input.receiptPrinterId);
  return prisma.terminal.create({ data: { ...input, displayToken: newDisplayToken() }, include });
}

export async function updateTerminal(id: number, input: UpdateTerminalInput, user: JwtPayload | undefined) {
  const existing = await findTerminal(id, user);
  await assertReceiptPrinter(existing.outletId, input.receiptPrinterId);
  return prisma.terminal.update({ where: { id }, data: input, include });
}

export async function deleteTerminal(id: number, user: JwtPayload | undefined) {
  await findTerminal(id, user);
  await prisma.$transaction([
    // A printer hosted by a deleted terminal can't be reached any more.
    prisma.printer.updateMany({ where: { terminalId: id }, data: { terminalId: null, isActive: false } }),
    prisma.terminal.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
}

export async function heartbeat(id: number, user: JwtPayload | undefined) {
  await findTerminal(id, user);
  return prisma.terminal.update({ where: { id }, data: { lastSeenAt: new Date() }, include });
}

export async function regenerateDisplayToken(id: number, user: JwtPayload | undefined) {
  await findTerminal(id, user);
  return prisma.terminal.update({ where: { id }, data: { displayToken: newDisplayToken() }, include });
}
