import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listDiscounts());
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createDiscount(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateDiscount(Number(req.params.id), req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteDiscount(Number(req.params.id));
  res.status(204).send();
});
