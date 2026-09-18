import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";
import { optionalIdQuery } from "../../lib/query";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const outletId = optionalIdQuery(req.query.outletId);
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  res.json(await service.listTables(outletId));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createTable(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateTable(Number(req.params.id), req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteTable(Number(req.params.id));
  res.status(204).send();
});

export const saveLayout = asyncHandler(async (req: Request, res: Response) => {
  const { outletId, tables } = req.body;
  res.json(await service.saveLayout(outletId, tables));
});
