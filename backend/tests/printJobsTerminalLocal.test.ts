import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    terminal: { findFirst: vi.fn() },
    printer: { findMany: vi.fn() },
    printJob: { findUnique: vi.fn() },
  },
}));
vi.mock("../src/lib/printing/queue", () => ({
  claimPending: vi.fn(),
  ack: vi.fn(),
}));

import { prisma } from "../src/lib/prisma";
import { ack, claimPending } from "../src/lib/printing/queue";
import { ackTerminalJob, claimJobsForTerminal } from "../src/modules/printJobs/service";

const admin = { userId: 1, role: "ADMIN", outletIds: [] } as const;
const cashierOtherOutlet = { userId: 2, role: "CASHIER", outletIds: [99] } as const;

describe("terminal-local print job claim/ack", () => {
  beforeEach(() => vi.clearAllMocks());

  it("claims only this terminal's TERMINAL_LOCAL printers", async () => {
    (prisma.terminal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5, outletId: 1, deletedAt: null });
    (prisma.printer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 10 }, { id: 11 }]);
    (claimPending as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 100, kind: "RECEIPT", printerId: 10, payload: Buffer.from("abc") },
    ]);

    const jobs = await claimJobsForTerminal(5, admin);

    expect(prisma.printer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ terminalId: 5, connection: "TERMINAL_LOCAL" }) })
    );
    expect(claimPending).toHaveBeenCalledWith([10, 11], 10);
    expect(jobs).toEqual([{ id: 100, kind: "RECEIPT", printerId: 10, payload: Buffer.from("abc").toString("base64") }]);
  });

  it("rejects claiming for a terminal outside the caller's outlet access", async () => {
    (prisma.terminal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5, outletId: 1, deletedAt: null });
    await expect(claimJobsForTerminal(5, cashierOtherOutlet)).rejects.toMatchObject({ status: 403 });
  });

  it("404s claiming for a terminal that doesn't exist", async () => {
    (prisma.terminal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(claimJobsForTerminal(999, admin)).rejects.toMatchObject({ status: 404 });
  });

  it("acks a TERMINAL_LOCAL job", async () => {
    (prisma.printJob.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 100,
      outletId: 1,
      printer: { connection: "TERMINAL_LOCAL" },
    });
    (ack as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 100, status: "PRINTED" });

    await ackTerminalJob(100, admin, { ok: true });
    expect(ack).toHaveBeenCalledWith(100, { ok: true });
  });

  it("refuses to ack a job that isn't a terminal-local print (e.g. bridge/direct)", async () => {
    (prisma.printJob.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 100,
      outletId: 1,
      printer: { connection: "NETWORK_DIRECT" },
    });
    await expect(ackTerminalJob(100, admin, { ok: true })).rejects.toMatchObject({ status: 400 });
    expect(ack).not.toHaveBeenCalled();
  });

  it("rejects acking a job outside the caller's outlet access", async () => {
    (prisma.printJob.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 100,
      outletId: 1,
      printer: { connection: "TERMINAL_LOCAL" },
    });
    await expect(ackTerminalJob(100, cashierOtherOutlet, { ok: true })).rejects.toMatchObject({ status: 403 });
    expect(ack).not.toHaveBeenCalled();
  });
});
