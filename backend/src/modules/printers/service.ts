import { PrinterConnection } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { JwtPayload } from "../../lib/jwt";
import { assertOutletAccess } from "../../lib/outletAccess";
import { enqueue } from "../../lib/printing/queue";
import { renderTestPage } from "../../lib/printing/templates/testPage";
import { CreatePrinterInput, UpdatePrinterInput } from "./validation";

const include = {
  bridge: { select: { id: true, name: true } },
  hostTerminal: { select: { id: true, name: true } },
};

async function findPrinter(id: number, user: JwtPayload | undefined) {
  const printer = await prisma.printer.findFirst({ where: { id, deletedAt: null }, include });
  if (!printer) throw ApiError.notFound("Printer not found");
  assertOutletAccess(user, printer.outletId);
  return printer;
}

// Each connection type needs a different "where is it" field. Validated on the
// merged record so a PATCH that only changes `connection` is still checked.
async function assertConnectionConfig(
  outletId: number,
  cfg: { connection: PrinterConnection; host?: string | null; bridgeId?: number | null; terminalId?: number | null }
) {
  switch (cfg.connection) {
    case "NETWORK_DIRECT":
      if (!cfg.host) throw ApiError.badRequest("A network printer needs an IP address or hostname");
      break;
    case "NETWORK_BRIDGE": {
      if (!cfg.host) throw ApiError.badRequest("A bridged printer needs an IP address or hostname");
      if (!cfg.bridgeId) throw ApiError.badRequest("Choose the print bridge that can reach this printer");
      const bridge = await prisma.printBridge.findFirst({ where: { id: cfg.bridgeId, outletId, deletedAt: null } });
      if (!bridge) throw ApiError.badRequest("Print bridge must belong to the same outlet");
      break;
    }
    case "TERMINAL_LOCAL": {
      if (!cfg.terminalId) throw ApiError.badRequest("Choose the terminal this printer is plugged into");
      const terminal = await prisma.terminal.findFirst({ where: { id: cfg.terminalId, outletId, deletedAt: null } });
      if (!terminal) throw ApiError.badRequest("Terminal must belong to the same outlet");
      break;
    }
  }
}

// Only keep the location field that matters for the chosen connection, so a
// printer switched from bridge to direct doesn't keep a stale bridgeId.
function normalizeLocation<T extends { connection: PrinterConnection; host?: string | null; bridgeId?: number | null; terminalId?: number | null }>(cfg: T): T {
  return {
    ...cfg,
    host: cfg.connection === "TERMINAL_LOCAL" ? null : cfg.host ?? null,
    bridgeId: cfg.connection === "NETWORK_BRIDGE" ? cfg.bridgeId ?? null : null,
    terminalId: cfg.connection === "TERMINAL_LOCAL" ? cfg.terminalId ?? null : null,
  };
}

export async function listPrinters(outletId: number) {
  return prisma.printer.findMany({
    where: { outletId, deletedAt: null },
    include,
    orderBy: { name: "asc" },
  });
}

export async function createPrinter(input: CreatePrinterInput) {
  await assertConnectionConfig(input.outletId, input);
  const data = normalizeLocation(input);
  // Sensible default columns for the paper size if not given explicitly.
  if (data.charsPerLine == null && data.paperWidth === 58) data.charsPerLine = 32;
  return prisma.printer.create({ data, include });
}

export async function updatePrinter(id: number, input: UpdatePrinterInput, user: JwtPayload | undefined) {
  const existing = await findPrinter(id, user);
  const merged = {
    connection: input.connection ?? existing.connection,
    host: input.host !== undefined ? input.host : existing.host,
    bridgeId: input.bridgeId !== undefined ? input.bridgeId : existing.bridgeId,
    terminalId: input.terminalId !== undefined ? input.terminalId : existing.terminalId,
  };
  await assertConnectionConfig(existing.outletId, merged);
  return prisma.printer.update({ where: { id }, data: { ...input, ...normalizeLocation(merged) }, include });
}

export async function deletePrinter(id: number, user: JwtPayload | undefined) {
  await findPrinter(id, user);
  await prisma.$transaction([
    prisma.terminal.updateMany({ where: { receiptPrinterId: id }, data: { receiptPrinterId: null } }),
    prisma.kitchenStation.updateMany({ where: { printerId: id }, data: { printerId: null } }),
    // Nothing will ever deliver these now.
    prisma.printJob.updateMany({
      where: { printerId: id, status: { in: ["PENDING", "CLAIMED"] } },
      data: { status: "FAILED", lastError: "Printer was deleted" },
    }),
    prisma.printer.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
}

export async function printTestPage(id: number, user: JwtPayload | undefined) {
  const printer = await findPrinter(id, user);
  const outlet = await prisma.outlet.findUniqueOrThrow({ where: { id: printer.outletId }, select: { name: true } });
  return enqueue({
    outletId: printer.outletId,
    printerId: printer.id,
    kind: "TEST",
    payload: renderTestPage(printer, outlet.name),
    createdById: user?.userId,
  });
}
