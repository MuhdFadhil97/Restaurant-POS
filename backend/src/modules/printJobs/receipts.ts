import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { JwtPayload } from "../../lib/jwt";
import { recordAudit } from "../../lib/audit";
import { assertOutletAccess } from "../../lib/outletAccess";
import { drawerKickBuffer } from "../../lib/printing/encoder";
import { enqueue } from "../../lib/printing/queue";
import { renderReceipt } from "../../lib/printing/templates/receipt";
import { getTransaction } from "../transactions/service";

// The terminal's receipt printer, or null when this terminal prints through
// the browser (no printer assigned, or the printer is disabled).
async function loadTerminal(terminalId: number, outletId: number) {
  const terminal = await prisma.terminal.findFirst({
    where: { id: terminalId, deletedAt: null, isActive: true },
    include: { receiptPrinter: true },
  });
  if (!terminal) throw ApiError.badRequest("This device's terminal no longer exists — set the device up again");
  if (terminal.outletId !== outletId) throw ApiError.badRequest("Terminal belongs to a different outlet");
  const printer = terminal.receiptPrinter;
  const usable = printer && printer.isActive && !printer.deletedAt ? printer : null;
  return { terminal, printer: usable };
}

// Runs after checkout/finalize has committed. Never throws: the sale is
// already done, so a printing problem is reported back, not raised.
export async function printAfterSale(transactionId: number, terminalId: number | undefined, userId: number) {
  if (!terminalId) return { receiptPrintJob: null, receiptPrintError: null };
  try {
    const transaction = await getTransaction(transactionId);
    const { terminal, printer } = await loadTerminal(terminalId, transaction.outletId);
    if (!printer) return { receiptPrintJob: null, receiptPrintError: null };

    const paidCash = transaction.payments.some((p) => p.method === "CASH");
    const job = await enqueue({
      outletId: transaction.outletId,
      printerId: printer.id,
      kind: "RECEIPT",
      payload: renderReceipt(transaction, printer, { openDrawer: paidCash && terminal.cashDrawerEnabled }),
      transactionId,
      createdById: userId,
    });
    return { receiptPrintJob: job, receiptPrintError: null };
  } catch (err) {
    console.error(`Receipt printing failed for transaction ${transactionId}:`, err);
    return { receiptPrintJob: null, receiptPrintError: (err as Error).message };
  }
}

export async function reprintReceipt(transactionId: number, terminalId: number, user: JwtPayload | undefined) {
  const transaction = await getTransaction(transactionId);
  assertOutletAccess(user, transaction.outletId);
  if (transaction.status !== "COMPLETED" && transaction.status !== "REFUNDED" && transaction.status !== "VOIDED") {
    throw ApiError.badRequest("Only paid transactions have a receipt to print");
  }
  const { printer } = await loadTerminal(terminalId, transaction.outletId);
  if (!printer) throw ApiError.badRequest("This terminal has no receipt printer");

  return enqueue({
    outletId: transaction.outletId,
    printerId: printer.id,
    kind: "RECEIPT",
    payload: renderReceipt(transaction, printer, { reprint: true }),
    transactionId,
    createdById: user?.userId,
  });
}

// "No sale" — pops the drawer without a transaction, always audited.
export async function openCashDrawer(terminalId: number, user: JwtPayload | undefined, reason: string | undefined) {
  if (!user) throw ApiError.unauthorized();
  const terminal = await prisma.terminal.findFirst({
    where: { id: terminalId, deletedAt: null },
    include: { receiptPrinter: true },
  });
  if (!terminal) throw ApiError.notFound("Terminal not found");
  assertOutletAccess(user, terminal.outletId);
  const printer = terminal.receiptPrinter;
  if (!terminal.cashDrawerEnabled || !printer || !printer.isActive || printer.deletedAt) {
    throw ApiError.badRequest("This terminal has no cash drawer connected");
  }

  const job = await enqueue({
    outletId: terminal.outletId,
    printerId: printer.id,
    kind: "DRAWER_KICK",
    payload: drawerKickBuffer(printer),
    createdById: user.userId,
  });
  await recordAudit(prisma, {
    userId: user.userId,
    action: "DRAWER_OPENED",
    entityType: "Terminal",
    entityId: terminal.id,
    outletId: terminal.outletId,
    details: { terminal: terminal.name, reason: reason || null, printJobId: job.id },
  });
  return job;
}
