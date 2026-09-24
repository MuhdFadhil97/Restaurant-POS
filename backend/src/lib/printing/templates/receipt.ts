import { env } from "../../../config/env";
import { PdfReceiptTransaction } from "../../../modules/einvoice/receiptPdfTemplate";
import { createDocument, finishDocument, money } from "../encoder";

export function formatPrintTime(date: Date | string) {
  return new Date(date).toLocaleString("en-MY", { timeZone: env.appTimeZone });
}

// Thermal-printer version of frontend/src/features/transactions/Receipt.tsx
// (same fields, same order), ported from the Android clone's
// receiptPrinterTemplate.ts. Keep the three in step when the receipt changes.
export function renderReceipt(
  transaction: PdfReceiptTransaction,
  printer: { charsPerLine: number },
  opts: { openDrawer?: boolean; reprint?: boolean } = {}
): Buffer {
  const doc = createDocument(printer);
  const totalItems = transaction.items.reduce((sum, item) => sum + item.quantity, 0);

  doc.alignCenter();
  if (opts.reprint) doc.println("** REPRINT **");
  doc.bold(true);
  doc.setTextDoubleHeight();
  doc.println(transaction.outlet.name);
  doc.setTextNormal();
  doc.bold(false);
  if (transaction.outlet.address) doc.println(transaction.outlet.address);
  if (transaction.outlet.einvoiceTin) doc.println(`TIN: ${transaction.outlet.einvoiceTin}`);
  if (transaction.outlet.einvoiceBrn) doc.println(`Reg No: ${transaction.outlet.einvoiceBrn}`);
  doc.println(formatPrintTime(transaction.createdAt));
  doc.println(`Receipt #${transaction.receiptNumber ?? transaction.id}`);
  if (transaction.cashier) doc.println(`Cashier: ${transaction.cashier.name}`);

  doc.alignLeft();
  doc.drawLine();
  doc.tableCustom([
    { text: "Item", align: "LEFT", width: 0.55, bold: true },
    { text: "Qty", align: "CENTER", width: 0.15, bold: true },
    { text: "Price", align: "RIGHT", width: 0.3, bold: true },
  ]);
  transaction.items.forEach((item, index) => {
    const name = `${index + 1}. ${item.product.name}${item.variant ? ` (${item.variant.value})` : ""}`;
    doc.tableCustom([
      { text: name, align: "LEFT", width: 0.55 },
      { text: String(item.quantity), align: "CENTER", width: 0.15 },
      { text: money(item.lineTotal), align: "RIGHT", width: 0.3 },
    ]);
  });

  doc.drawLine();
  doc.leftRight("Total Items", String(totalItems));
  doc.leftRight("Subtotal", money(transaction.subtotal));
  doc.leftRight("Discount", `-${money(transaction.discountTotal)}`);
  if (Number(transaction.serviceChargeTotal) > 0) {
    doc.leftRight("Service Charge", money(transaction.serviceChargeTotal));
  }
  doc.leftRight("Tax", money(transaction.taxTotal));
  doc.bold(true);
  doc.leftRight("Total", money(transaction.total));
  doc.bold(false);

  doc.drawLine();
  for (const payment of transaction.payments) {
    doc.leftRight(payment.method, money(payment.amount));
    if (payment.method === "CARD" && payment.reference) {
      doc.alignRight();
      doc.println(payment.reference);
      doc.alignLeft();
    }
  }

  if (transaction.einvoiceStatus === "GENERATED") {
    doc.drawLine();
    doc.alignCenter();
    doc.println("Malaysia e-Invoice");
    // The validation QR needs the public frontend URL, which only the
    // frontend knows by default (VITE_PUBLIC_URL); set PUBLIC_APP_URL on the
    // backend to print it.
    if (env.publicAppUrl && transaction.einvoiceUuid && transaction.einvoiceLongId) {
      doc.printQR(`${env.publicAppUrl}/einvoice/${transaction.einvoiceUuid}/share/${transaction.einvoiceLongId}`, {
        cellSize: 4,
        correction: "M",
      });
      doc.println("Scan to validate");
    } else {
      doc.println("Verified");
    }
    doc.alignLeft();
  } else if (transaction.einvoiceStatus === "CANCELLED") {
    doc.drawLine();
    doc.alignCenter();
    doc.println("e-Invoice Cancelled");
    doc.alignLeft();
  }

  doc.newLine();
  doc.alignCenter();
  doc.println(transaction.outlet.receiptFooter || "Thank you!");
  return finishDocument(doc, { openDrawer: opts.openDrawer });
}
