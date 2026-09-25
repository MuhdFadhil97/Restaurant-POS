import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import { optionalIdQuery } from "../../lib/query";
import * as service from "./service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const outletId = optionalIdQuery(req.query.outletId);
  if (!outletId) throw ApiError.badRequest("outletId is required");
  res.json(await service.listPlatforms(outletId));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createPlatform(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updatePlatform(Number(req.params.id), req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deletePlatform(Number(req.params.id));
  res.status(204).send();
});
