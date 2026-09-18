import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";
import { optionalIdQuery } from "../../lib/query";

export const open = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  res.status(201).json(await service.openSession(req.user.userId, req.body));
});

export const close = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.closeSession(Number(req.params.id), req.body));
});

export const current = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const outletId = optionalIdQuery(req.query.outletId);
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  res.json(await service.getCurrentSession(req.user.userId, outletId));
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const outletId = optionalIdQuery(req.query.outletId);
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  res.json(await service.listSessions(outletId));
});
