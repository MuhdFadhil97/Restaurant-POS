import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { buildLedgerRows, LedgerTransaction } from "../../lib/accountingExport/ledger";
import { getFormatter } from "../../lib/accountingExport/formats";
import { CreateRunInput } from "./validation";

// Not under uploads/products (which app.ts serves via express.static) —
// exported ledgers are a financial record, so downloads go through the
// authenticated GET /accounting-export/runs/:id/download route instead of a
// public static mount.
const exportDir = path.join(__dirname, "../../../uploads/accounting-exports");
fs.mkdirSync(exportDir, { recursive: true });

export async function generateRun(input: CreateRunInput, requestedByUserId: number) {
  const periodStart = new Date(input.periodStart);
  const periodEnd = new Date(input.periodEnd);
  if (periodEnd < periodStart) {
    throw ApiError.badRequest("periodEnd must not be before periodStart");
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      outletId: input.outletId,
      status: "COMPLETED",
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { createdAt: "asc" },
    select: {
      receiptNumber: true,
      createdAt: true,
      discountTotal: true,
      serviceChargeTotal: true,
      taxTotal: true,
      total: true,
      items: {
        select: {
          lineTotal: true,
          taxAmount: true,
          discountAmount: true,
          product: { select: { category: { select: { name: true, accountingCategory: true } } } },
        },
      },
      // Ordered so a cash payment's change (tendered amount minus total, not
      // stored as its own row) is excluded from whichever payment comes
      // last, not an arbitrary one — see buildLedgerRows.
      payments: { select: { method: true, amount: true }, orderBy: { id: "asc" } },
    },
  });

  const ledgerTransactions: LedgerTransaction[] = transactions.map((t) => ({
    receiptNumber: t.receiptNumber,
    createdAt: t.createdAt,
    discountTotal: Number(t.discountTotal),
    serviceChargeTotal: Number(t.serviceChargeTotal),
    taxTotal: Number(t.taxTotal),
    total: Number(t.total),
    items: t.items.map((i) => ({
      lineTotal: Number(i.lineTotal),
      taxAmount: Number(i.taxAmount),
      discountAmount: Number(i.discountAmount),
      product: { category: i.product.category },
    })),
    payments: t.payments.map((p) => ({ method: p.method, amount: Number(p.amount) })),
  }));

  const rows = ledgerTransactions.flatMap(buildLedgerRows);
  const csv = getFormatter(input.format)(rows);
  const filename = `${randomUUID()}.csv`;
  fs.writeFileSync(path.join(exportDir, filename), csv, "utf8");

  return prisma.accountingExportRun.create({
    data: {
      outletId: input.outletId,
      format: input.format,
      status: "COMPLETED",
      periodStart,
      periodEnd,
      fileUrl: filename,
      rowCount: rows.length,
      requestedByUserId,
    },
    include: { requestedBy: { select: { id: true, name: true } } },
  });
}

export async function listRuns(outletId: number) {
  return prisma.accountingExportRun.findMany({
    where: { outletId },
    orderBy: { createdAt: "desc" },
    include: { requestedBy: { select: { id: true, name: true } } },
  });
}

export async function getRunFile(
  id: number
): Promise<{ buffer: Buffer; run: { outletId: number; format: string; periodStart: Date; periodEnd: Date } }> {
  const run = await prisma.accountingExportRun.findUnique({ where: { id } });
  if (!run) throw ApiError.notFound("Export run not found");
  if (run.status !== "COMPLETED" || !run.fileUrl) {
    throw ApiError.badRequest("This export run has no downloadable file");
  }
  const filePath = path.join(exportDir, run.fileUrl);
  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound("Export file is missing from storage");
  }
  const buffer = fs.readFileSync(filePath);
  return {
    buffer,
    run: { outletId: run.outletId, format: run.format, periodStart: run.periodStart, periodEnd: run.periodEnd },
  };
}
