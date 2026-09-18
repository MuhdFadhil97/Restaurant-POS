import { Request, Response } from "express";
import { ZodError } from "zod";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import { prisma } from "../../lib/prisma";
import * as service from "./service";
import { ReportQuery } from "./validation";
import { getReportDefinition } from "./registry";
import { exportToExcel } from "./export/excelExporter";
import { exportToPdf } from "./export/pdfExporter";

function parseQuery<T>(schema: { parse: (v: unknown) => T }, query: unknown): T {
  try {
    return schema.parse(query);
  } catch (err) {
    if (err instanceof ZodError) {
      throw ApiError.badRequest("Validation failed", err.flatten());
    }
    throw err;
  }
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Legacy JSON endpoints — unchanged shape, kept for the existing sales report
// hooks/UI (frontend/src/api/reports.ts).
export const summary = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.salesSummary(req.query as unknown as ReportQuery));
});

export const topProducts = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.topProducts(req.query as unknown as ReportQuery));
});

export const byCashier = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.salesByCashier(req.query as unknown as ReportQuery));
});

export const byPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.salesByPaymentMethod(req.query as unknown as ReportQuery));
});

// Generic catalog-driven endpoints — cover every report via the registry.
export const getReport = asyncHandler(async (req: Request, res: Response) => {
  const def = getReportDefinition(req.params.reportKey);
  const query = parseQuery(def.querySchema, req.query);
  res.json(await def.fetch(query));
});

export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  const def = getReportDefinition(req.params.reportKey);
  const { format, ...rest } = req.query;
  if (format !== "xlsx" && format !== "pdf") {
    throw ApiError.badRequest("format must be xlsx or pdf");
  }
  const query = parseQuery(def.querySchema, rest);
  const data = await def.fetch(query);

  if (req.user) {
    const actor = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true } });
    data.meta.generatedBy = actor?.name;
  }

  const filename = `${slugify(data.title)}.${format}`;

  if (format === "xlsx") {
    const buffer = await exportToExcel(data);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } else {
    const buffer = await exportToPdf(data);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }
});
