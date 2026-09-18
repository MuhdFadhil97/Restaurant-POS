import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listCategories());
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getCategory(Number(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createCategory(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateCategory(Number(req.params.id), req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteCategory(Number(req.params.id));
  res.status(204).send();
});
