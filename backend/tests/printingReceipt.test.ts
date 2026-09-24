import { describe, expect, it } from "vitest";
import { DRAWER_KICK } from "../src/lib/printing/encoder";
import { renderReceipt } from "../src/lib/printing/templates/receipt";
import { PdfReceiptTransaction } from "../src/modules/einvoice/receiptPdfTemplate";

const transaction = {
  id: 42,
  receiptNumber: "REC20260924000001",
  createdAt: new Date("2026-09-24T04:30:00Z"),
  subtotal: 20,
  discountTotal: 0,
  serviceChargeTotal: 2,
  taxTotal: 1.32,
  total: 23.32,
  einvoiceStatus: "NOT_APPLICABLE",
  einvoiceUuid: null,
  einvoiceLongId: null,
  outlet: { name: "Kafe 97", address: "Jalan Test", einvoiceTin: null, einvoiceBrn: null, receiptFooter: "Jumpa lagi!" },
  cashier: { id: 1, name: "Ali" },
  items: [
    { quantity: 2, lineTotal: 16, product: { name: "Americano" }, variant: null },
    { quantity: 1, lineTotal: 4, product: { name: "Teh Tarik" }, variant: { value: "Iced" } },
  ],
  payments: [{ method: "CASH", amount: 30, reference: null }],
} as unknown as PdfReceiptTransaction;

const printer = { charsPerLine: 48 };

describe("thermal receipt", () => {
  it("contains the same fields as the on-screen receipt", () => {
    const text = renderReceipt(transaction, printer).toString("latin1");
    for (const s of ["Kafe 97", "Receipt #REC20260924000001", "Cashier: Ali", "1. Americano", "2. Teh Tarik (Iced)",
      "Service Charge", "RM 23.32", "CASH", "Jumpa lagi!"]) {
      expect(text).toContain(s);
    }
    // Times are printed in Malaysia time (UTC+8), not the server's zone.
    expect(text).toContain("12:30");
  });

  it("only kicks the drawer when asked, before the cut", () => {
    expect(renderReceipt(transaction, printer).includes(DRAWER_KICK)).toBe(false);
    const buf = renderReceipt(transaction, printer, { openDrawer: true });
    const kickAt = buf.indexOf(DRAWER_KICK);
    expect(kickAt).toBeGreaterThan(0);
    expect(buf.indexOf(Buffer.from([0x1d, 0x56]))).toBeGreaterThan(kickAt);
  });

  it("marks reprints", () => {
    expect(renderReceipt(transaction, printer, { reprint: true }).toString("latin1")).toContain("** REPRINT **");
  });
});
