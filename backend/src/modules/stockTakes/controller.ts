import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import { optionalIdQuery } from "../../lib/query";
import * as service from "./service";

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listStockTakes(optionalIdQuery(req.query.outletId)));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getStockTake(Number(req.params.id)));
});

export const start = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.status(201).json(await service.startStockTake(user.userId, req.body));
});

export const saveCounts = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.saveCounts(Number(req.params.id), req.body));
});

export const complete = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.json(await service.completeStockTake(Number(req.params.id), user.userId));
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.cancelStockTake(Number(req.params.id)));
});
