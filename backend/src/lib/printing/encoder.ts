import { printer as ThermalPrinter, types as PrinterTypes } from "node-thermal-printer";

// node-thermal-printer is used purely as an ESC/POS byte builder here: the
// document is rendered to a Buffer with getBuffer() and stored on a PrintJob,
// then delivered by whichever transport the printer uses (direct TCP, print
// bridge, or a terminal's USB/Bluetooth connection). execute() is never
// called, so the interface string below is never connected to.
export function createDocument(printer: { charsPerLine: number }): ThermalPrinter {
  return new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: "tcp://127.0.0.1:9100",
    width: printer.charsPerLine,
    removeSpecialCharacters: true,
  });
}

// ESC p m t1 t2: pulse drawer pin 2 for 25×2ms on, 250×2ms off. Written by
// hand because node-thermal-printer's openCashDrawer() omits t1/t2, so a real
// printer would swallow the next two bytes of the job (e.g. the cut) as timings.
export const DRAWER_KICK = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);

export function finishDocument(doc: ThermalPrinter, opts: { cut?: boolean; openDrawer?: boolean } = {}): Buffer {
  if (opts.openDrawer) doc.add(DRAWER_KICK);
  if (opts.cut ?? true) {
    doc.newLine();
    doc.newLine();
    doc.cut();
  }
  return doc.getBuffer();
}

// Standalone drawer pulse (ESC p 0 25 250) for "No sale" opens — no paper fed.
export function drawerKickBuffer(printer: { charsPerLine: number }): Buffer {
  const doc = createDocument(printer);
  return finishDocument(doc, { cut: false, openDrawer: true });
}

export function money(value: unknown): string {
  return `RM ${Number(value).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
