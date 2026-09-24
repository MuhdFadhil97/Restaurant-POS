import { createDocument, finishDocument } from "../encoder";
import { formatPrintTime } from "./receipt";

export function renderTestPage(printer: {
  name: string;
  connection: string;
  host: string | null;
  port: number;
  paperWidth: number;
  charsPerLine: number;
}, outletName: string): Buffer {
  const doc = createDocument(printer);
  doc.alignCenter();
  doc.bold(true);
  doc.setTextDoubleHeight();
  doc.println("TEST PRINT");
  doc.setTextNormal();
  doc.bold(false);
  doc.println(outletName);
  doc.drawLine();
  doc.alignLeft();
  doc.leftRight("Printer", printer.name);
  doc.leftRight("Connection", printer.connection);
  if (printer.host) doc.leftRight("Address", `${printer.host}:${printer.port}`);
  doc.leftRight("Paper", `${printer.paperWidth}mm / ${printer.charsPerLine} chars`);
  doc.leftRight("Time", formatPrintTime(new Date()));
  doc.drawLine();
  // A full-width ruler makes a wrong chars-per-line setting obvious at a glance.
  doc.println("1234567890".repeat(Math.ceil(printer.charsPerLine / 10)).slice(0, printer.charsPerLine));
  doc.alignCenter();
  doc.println("If you can read this, the printer works.");
  return finishDocument(doc);
}
