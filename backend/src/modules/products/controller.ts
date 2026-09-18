import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";
import { parseCsv, csvRowsToObjects, buildProductImportTemplate, buildBulkAdjustmentTemplate } from "./csv";
import { ApiError } from "../../lib/apiError";

function canSeeCost(req: Request) {
  return req.user?.role === "ADMIN" || req.user?.role === "MANAGER";
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const outletId = typeof req.query.outletId === "string" ? req.query.outletId : undefined;
  res.json(await service.listProducts(outletId, canSeeCost(req)));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const outletId = typeof req.query.outletId === "string" ? req.query.outletId : undefined;
  res.json(await service.getProduct(req.params.id, outletId, canSeeCost(req)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createProduct(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateProduct(req.params.id, req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteProduct(req.params.id);
  res.status(204).send();
});

export const downloadTemplate = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="products-import-template.csv"');
  res.send(buildProductImportTemplate());
});

export const previewImportProducts = asyncHandler(async (req: Request, res: Response) => {
  const outletId = typeof req.query.outletId === "string" ? req.query.outletId : undefined;
  const rows = csvRowsToObjects(parseCsv(req.body.csv));
  if (rows.length === 0) throw ApiError.badRequest("CSV file has no data rows");
  res.json(await service.previewImportProducts(rows, outletId));
});

export const importProducts = asyncHandler(async (req: Request, res: Response) => {
  const outletId = typeof req.query.outletId === "string" ? req.query.outletId : undefined;
  const rows = csvRowsToObjects(parseCsv(req.body.csv));
  if (rows.length === 0) throw ApiError.badRequest("CSV file has no data rows");
  res.json(await service.importProducts(rows, outletId));
});

export const downloadBulkAdjustmentTemplate = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="products-bulk-adjustment-template.csv"');
  res.send(buildBulkAdjustmentTemplate());
});

export const previewBulkAdjustProducts = asyncHandler(async (req: Request, res: Response) => {
  const outletId = typeof req.query.outletId === "string" ? req.query.outletId : undefined;
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  const rows = csvRowsToObjects(parseCsv(req.body.csv));
  if (rows.length === 0) throw ApiError.badRequest("CSV file has no data rows");
  res.json(await service.previewBulkAdjustProducts(rows, outletId));
});

export const bulkAdjustProducts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const outletId = typeof req.query.outletId === "string" ? req.query.outletId : undefined;
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  const rows = csvRowsToObjects(parseCsv(req.body.csv));
  if (rows.length === 0) throw ApiError.badRequest("CSV file has no data rows");
  res.json(await service.bulkAdjustProducts(rows, outletId, req.user.userId));
});
