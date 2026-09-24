import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import { optionalIdQuery } from "../../lib/query";
import * as service from "./service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const outletId = optionalIdQuery(req.query.outletId);
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  res.json(await service.listPrinters(outletId));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createPrinter(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updatePrinter(Number(req.params.id), req.body, req.user));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deletePrinter(Number(req.params.id), req.user);
  res.status(204).send();
});

export const test = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.printTestPage(Number(req.params.id), req.user));
});
