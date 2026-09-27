import { describe, expect, it } from "vitest";
import { renderKitchenTicket } from "../src/lib/printing/templates/kitchenTicket";

const base = {
  stationName: "Kitchen",
  transactionId: 12,
  origin: "POS" as const,
  staffName: "Ali",
  lines: [
    { quantity: 2, productName: "Nasi Lemak" },
    { quantity: 1, productName: "Teh Tarik", variantValue: "Iced" },
  ],
};

const text = (buf: Buffer) => buf.toString("latin1");

describe("kitchen ticket", () => {
  it("shows station, table, order and items without prices", () => {
    const t = text(renderKitchenTicket({ charsPerLine: 48 }, { ...base, tableName: "T3", kind: "NEW", notes: "No chilli" }));
    for (const s of ["KITCHEN", "TABLE T3", "Order #12", "By: Ali", "2 x Nasi Lemak", "1 x Teh Tarik", "- Iced", "No chilli"]) {
      expect(t).toContain(s);
    }
    expect(t).not.toContain("RM");
    expect(t).not.toContain("ADDITIONAL");
  });

  it("prints per-item notes under the item", () => {
    const lines = [{ quantity: 1, productName: "Teh Tarik", variantValue: "Iced", notes: "less sugar" }, { quantity: 1, productName: "Roti" }];
    const t = text(renderKitchenTicket({ charsPerLine: 48 }, { ...base, kind: "NEW", lines }));
    expect(t).toContain("* less sugar");
    expect(t.indexOf("- Iced")).toBeLessThan(t.indexOf("* less sugar"));
    expect(t.indexOf("* less sugar")).toBeLessThan(t.indexOf("1 x Roti"));
  });

  it("labels takeaway, follow-up and QR orders", () => {
    const t = text(renderKitchenTicket({ charsPerLine: 48 }, { ...base, origin: "QR", kind: "ADDITIONAL" }));
    expect(t).toContain("TAKEAWAY");
    expect(t).toContain("ADDITIONAL ORDER");
    expect(t).toContain("QR self-order");
  });

  it("cancellation tickets are marked and skip order notes", () => {
    const t = text(renderKitchenTicket({ charsPerLine: 48 }, { ...base, kind: "CANCEL", notes: "No chilli" }));
    expect(t).toContain("CANCELLED");
    expect(t).not.toContain("No chilli");
  });
});
