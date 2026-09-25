import { createDocument, finishDocument } from "../encoder";
import { formatPrintClock } from "./receipt";

export interface KitchenTicketLine {
  quantity: number;
  productName: string;
  variantValue?: string | null;
}

// Kitchen/bar order ticket: big, sparse, no prices — read at arm's length
// from a rail. `kind` distinguishes a normal (or follow-up) order from a
// cancellation of items already sent.
export function renderKitchenTicket(
  printer: { charsPerLine: number },
  ticket: {
    stationName: string;
    transactionId: number;
    tableName?: string | null;
    origin: "POS" | "QR" | "DELIVERY";
    staffName?: string | null;
    notes?: string | null;
    kind: "NEW" | "ADDITIONAL" | "CANCEL";
    lines: KitchenTicketLine[];
    at?: Date;
  }
): Buffer {
  const doc = createDocument(printer);

  doc.alignCenter();
  if (ticket.kind === "CANCEL") {
    doc.invert(true);
    doc.bold(true);
    doc.setTextDoubleHeight();
    doc.println(" *** CANCELLED *** ");
    doc.setTextNormal();
    doc.bold(false);
    doc.invert(false);
  } else if (ticket.kind === "ADDITIONAL") {
    doc.bold(true);
    doc.println("-- ADDITIONAL ORDER --");
    doc.bold(false);
  }
  doc.setTextNormal();
  doc.println(ticket.stationName.toUpperCase());
  doc.setTextSize(1, 1);
  doc.bold(true);
  doc.println(ticket.tableName ? `TABLE ${ticket.tableName}` : ticket.origin === "DELIVERY" ? "DELIVERY" : "TAKEAWAY");
  doc.bold(false);
  doc.setTextNormal();

  doc.alignLeft();
  doc.leftRight(`Order #${ticket.transactionId}`, formatPrintClock(ticket.at ?? new Date()));
  const by = ticket.origin === "QR" ? "QR self-order" : ticket.origin === "DELIVERY" ? "Delivery platform" : ticket.staffName;
  if (by) doc.println(`By: ${by}`);
  doc.drawLine();

  for (const line of ticket.lines) {
    doc.bold(true);
    doc.setTextDoubleHeight();
    doc.println(`${line.quantity} x ${line.productName}`);
    doc.setTextNormal();
    doc.bold(false);
    if (line.variantValue) doc.println(`    - ${line.variantValue}`);
  }

  if (ticket.notes && ticket.kind !== "CANCEL") {
    doc.drawLine();
    doc.bold(true);
    doc.println("NOTE:");
    doc.bold(false);
    doc.println(ticket.notes);
  }
  doc.drawLine();
  return finishDocument(doc);
}
