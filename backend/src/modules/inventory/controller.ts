import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";
import { optionalIdQuery } from "../../lib/query";

export const adjust = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  res.status(201).json(await service.adjustStock(req.user.userId, req.body));
});

export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  const outletId = optionalIdQuery(req.query.outletId);
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  const productId = optionalIdQuery(req.query.productId);
  res.json(await service.listMovements(outletId, productId));
});

export const lowStock = asyncHandler(async (req: Request, res: Response) => {
  const outletId = optionalIdQuery(req.query.outletId);
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  res.json(await service.listLowStock(outletId));
});
