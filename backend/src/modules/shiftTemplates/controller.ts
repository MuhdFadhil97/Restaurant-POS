import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listShiftTemplates(req.query.outletId as string));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getShiftTemplate(req.params.id));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createShiftTemplate(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateShiftTemplate(req.params.id, req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteShiftTemplate(req.params.id);
  res.status(204).send();
});
