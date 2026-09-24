import { prisma } from "../../lib/prisma";
import { enqueue } from "../../lib/printing/queue";
import { KitchenTicketLine, renderKitchenTicket } from "../../lib/printing/templates/kitchenTicket";

// NOTE: must not import transactions/service — that module imports this one
// (for cancellation tickets), so the dependency only runs one way.

type Printer = { id: number; name: string; charsPerLine: number; isActive: boolean; deletedAt: Date | null };

function usablePrinter(printer: Printer | null | undefined) {
  return printer && printer.isActive && !printer.deletedAt ? printer : null;
}

export interface KitchenSendResult {
  tickets: { stationName: string; printerName: string; jobId: number; itemCount: number }[];
  // Items with no station, or whose station has no printer — KDS only.
  unroutedCount: number;
}

// Sends every not-yet-sent item on the transaction to its station's printer,
// one ticket per station. Items are claimed by stamping kitchenPrintedAt with
// a unique timestamp first, so two quick "Send to kitchen" taps (or a send
// racing checkout) can't print the same item twice.
export async function sendToKitchen(transactionId: number, userId: number | null): Promise<KitchenSendResult> {
  const stamp = new Date();
  const claimed = await prisma.transactionItem.updateMany({
    where: { transactionId, kitchenPrintedAt: null },
    data: { kitchenPrintedAt: stamp },
  });
  if (claimed.count === 0) return { tickets: [], unroutedCount: 0 };

  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: {
      table: { select: { name: true } },
      cashier: { select: { name: true } },
      items: {
        where: { kitchenPrintedAt: stamp },
        orderBy: { id: "asc" },
        include: {
          variant: { select: { value: true } },
          product: { select: { name: true, station: { include: { printer: true } } } },
        },
      },
    },
  });
  const followUp = (await prisma.transactionItem.count({
    where: { transactionId, kitchenPrintedAt: { not: null }, NOT: { kitchenPrintedAt: stamp } },
  })) > 0;

  const byStation = new Map<number, { stationName: string; printer: Printer; lines: KitchenTicketLine[] }>();
  let unroutedCount = 0;
  for (const item of transaction.items) {
    const station = item.product.station;
    const printer = station && !station.deletedAt ? usablePrinter(station.printer) : null;
    if (!station || !printer) {
      unroutedCount++;
      continue;
    }
    const group = byStation.get(station.id) ?? { stationName: station.name, printer, lines: [] };
    group.lines.push({ quantity: item.quantity, productName: item.product.name, variantValue: item.variant?.value });
    byStation.set(station.id, group);
  }

  const tickets: KitchenSendResult["tickets"] = [];
  for (const group of byStation.values()) {
    const job = await enqueue({
      outletId: transaction.outletId,
      printerId: group.printer.id,
      kind: "KITCHEN_TICKET",
      payload: renderKitchenTicket(group.printer, {
        stationName: group.stationName,
        transactionId,
        tableName: transaction.table?.name,
        origin: transaction.origin,
        staffName: transaction.cashier.name,
        notes: transaction.notes,
        kind: followUp ? "ADDITIONAL" : "NEW",
        lines: group.lines,
        at: stamp,
      }),
      transactionId,
      createdById: userId,
    });
    tickets.push({ stationName: group.stationName, printerName: group.printer.name, jobId: job.id, itemCount: group.lines.length });
  }
  return { tickets, unroutedCount };
}

// For automatic triggers (checkout, table send, QR orders): the order itself
// has already been saved, so a printing problem is logged, never raised.
export async function sendToKitchenSafely(transactionId: number, userId: number | null) {
  try {
    return await sendToKitchen(transactionId, userId);
  } catch (err) {
    console.error(`Kitchen ticket printing failed for transaction ${transactionId}:`, err);
    return null;
  }
}

export interface CancelledKitchenItem {
  productId: number;
  variantId: number | null;
  quantity: number;
}

// Prints a CANCELLED ticket for items (or part-quantities) that were already
// sent to the kitchen and have since been removed from the order.
export async function printKitchenCancellation(transactionId: number, items: CancelledKitchenItem[], userId: number | null) {
  if (items.length === 0) return;
  try {
    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { table: { select: { name: true } }, cashier: { select: { name: true } } },
    });
    const byStation = new Map<number, { stationName: string; printer: Printer; lines: KitchenTicketLine[] }>();
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true, station: { include: { printer: true } } },
      });
      const variant = item.variantId
        ? await prisma.productVariant.findUnique({ where: { id: item.variantId }, select: { value: true } })
        : null;
      const station = product?.station;
      const printer = station && !station.deletedAt ? usablePrinter(station.printer) : null;
      if (!product || !station || !printer) continue;
      const group = byStation.get(station.id) ?? { stationName: station.name, printer, lines: [] };
      group.lines.push({ quantity: item.quantity, productName: product.name, variantValue: variant?.value });
      byStation.set(station.id, group);
    }
    for (const group of byStation.values()) {
      await enqueue({
        outletId: transaction.outletId,
        printerId: group.printer.id,
        kind: "KITCHEN_TICKET",
        payload: renderKitchenTicket(group.printer, {
          stationName: group.stationName,
          transactionId,
          tableName: transaction.table?.name,
          origin: transaction.origin,
          staffName: transaction.cashier.name,
          kind: "CANCEL",
          lines: group.lines,
        }),
        transactionId,
        createdById: userId,
      });
    }
  } catch (err) {
    console.error(`Kitchen cancellation printing failed for transaction ${transactionId}:`, err);
  }
}
