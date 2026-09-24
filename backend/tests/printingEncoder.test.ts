import { describe, expect, it } from "vitest";
import { DRAWER_KICK, drawerKickBuffer } from "../src/lib/printing/encoder";
import { renderTestPage } from "../src/lib/printing/templates/testPage";

const printer = {
  name: "Counter",
  connection: "NETWORK_DIRECT",
  host: "192.168.1.50",
  port: 9100,
  paperWidth: 80,
  charsPerLine: 48,
};

const CUT = Buffer.from([0x1d, 0x56]);

describe("ESC/POS encoder", () => {
  it("drawer kick is the full 5-byte ESC p command and nothing else", () => {
    const buf = drawerKickBuffer(printer);
    expect(buf.includes(DRAWER_KICK)).toBe(true);
    expect(DRAWER_KICK.length).toBe(5);
    expect(buf.includes(CUT)).toBe(false);
  });

  it("test page is laid out to the configured width and ends with a cut", () => {
    const buf = renderTestPage(printer, "Kafe 97");
    const text = buf.toString("latin1");
    expect(text).toContain("TEST PRINT");
    expect(text).toContain("Kafe 97");
    expect(text).toContain("1234567890".repeat(5).slice(0, 48));
    expect(buf.includes(CUT)).toBe(true);
    expect(buf.includes(DRAWER_KICK)).toBe(false);
  });

  it("respects narrower 58mm paper", () => {
    const text = renderTestPage({ ...printer, paperWidth: 58, charsPerLine: 32 }, "Kafe 97").toString("latin1");
    expect(text).toContain("-".repeat(32) + "\n");
    expect(text).not.toContain("-".repeat(33));
  });
});
