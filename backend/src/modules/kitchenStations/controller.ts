import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const outletId = req.query.outletId as string;
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  res.json(await service.listStations(outletId));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createStation(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateStation(req.params.id, req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteStation(req.params.id);
  res.status(204).send();
});
