import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import { optionalIdQuery } from "../../lib/query";
import * as service from "./service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const supplierId = optionalIdQuery(req.query.supplierId);
  if (!supplierId) throw ApiError.badRequest("supplierId query param is required");
  res.json(await service.listSupplierProducts(supplierId));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createSupplierProduct(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateSupplierProduct(Number(req.params.id), req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteSupplierProduct(Number(req.params.id));
  res.status(204).send();
});

export const priceHistory = asyncHandler(async (req: Request, res: Response) => {
  const supplierId = optionalIdQuery(req.query.supplierId);
  const productId = optionalIdQuery(req.query.productId);
  if (!supplierId || !productId) throw ApiError.badRequest("supplierId and productId query params are required");
  res.json(await service.getPriceHistory(supplierId, productId));
});
