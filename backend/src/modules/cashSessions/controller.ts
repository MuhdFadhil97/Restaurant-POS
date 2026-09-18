import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";

export const open = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  res.status(201).json(await service.openSession(req.user.userId, req.body));
});

export const close = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.closeSession(req.params.id, req.body));
});

export const current = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const outletId = req.query.outletId as string;
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  res.json(await service.getCurrentSession(req.user.userId, outletId));
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const outletId = req.query.outletId as string;
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  res.json(await service.listSessions(outletId));
});
