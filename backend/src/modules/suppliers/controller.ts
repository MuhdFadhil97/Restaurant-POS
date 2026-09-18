import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listSuppliers());
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getSupplier(Number(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createSupplier(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateSupplier(Number(req.params.id), req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteSupplier(Number(req.params.id));
  res.status(204).send();
});
