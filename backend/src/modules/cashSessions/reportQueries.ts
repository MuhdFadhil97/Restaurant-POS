import { prisma } from "../../lib/prisma";
import { buildMeta } from "../reports/export/reportMeta";
import { ReportData } from "../reports/types";
import { ReportQuery } from "../reports/validation";

async function sessionsInRange(query: ReportQuery) {
  return prisma.cashSession.findMany({
    where: { outletId: query.outletId, openedAt: { gte: new Date(query.from), lte: new Date(query.to) } },
    include: { user: { select: { name: true } } },
    orderBy: { openedAt: "desc" },
  });
}

export async function cashReconciliationReport(query: ReportQuery): Promise<ReportData> {
  const sessions = await sessionsInRange(query);

  const rows = sessions.map((s) => ({
    cashierName: s.user.name,
    openedAt: s.openedAt.toISOString(),
    closedAt: s.closedAt?.toISOString() ?? "",
    openingCash: Number(s.openingCash),
    expectedCash: s.expectedCash !== null ? Number(s.expectedCash) : null,
    actualCash: s.actualCash !== null ? Number(s.actualCash) : null,
    difference: s.difference !== null ? Number(s.difference) : null,
    status: s.status,
  }));

  return {
    title: "Cash Reconciliation",
    columns: [
      { key: "cashierName", header: "Cashier" },
      { key: "openedAt", header: "Opened", format: "datetime" },
      { key: "closedAt", header: "Closed", format: "datetime" },
      { key: "openingCash", header: "Opening Cash", format: "currency" },
      { key: "expectedCash", header: "Expected", format: "currency" },
      { key: "actualCash", header: "Actual", format: "currency" },
      { key: "difference", header: "Difference", format: "currency" },
      { key: "status", header: "Status" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}

export async function cashVarianceSummaryReport(query: ReportQuery): Promise<ReportData> {
  const sessions = await sessionsInRange(query);

  const byCashier = new Map<string, { cashierName: string; sessionCount: number; totalVariance: number; flagged: number }>();
  for (const s of sessions) {
    if (s.difference === null) continue;
    const entry = byCashier.get(s.user.name) ?? { cashierName: s.user.name, sessionCount: 0, totalVariance: 0, flagged: 0 };
    entry.sessionCount += 1;
    entry.totalVariance += Number(s.difference);
    if (Math.abs(Number(s.difference)) >= 10) entry.flagged += 1;
    byCashier.set(s.user.name, entry);
  }

  const rows = Array.from(byCashier.values()).sort((a, b) => Math.abs(b.totalVariance) - Math.abs(a.totalVariance));

  return {
    title: "Cash Variance Summary",
    columns: [
      { key: "cashierName", header: "Cashier" },
      { key: "sessionCount", header: "Sessions", format: "number" },
      { key: "totalVariance", header: "Total Over/Short", format: "currency" },
      { key: "flagged", header: "Flagged Sessions (>= RM10)", format: "number" },
    ],
    rows,
    meta: await buildMeta(query),
  };
}
