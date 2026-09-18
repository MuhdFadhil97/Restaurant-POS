import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const outlets = await service.listOutlets(req.user.userId, req.user.role === "ADMIN");
  res.json(outlets);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const outlet = await service.getOutlet(req.params.id);
  res.json(outlet);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const outlet = await service.createOutlet(req.body);
  res.status(201).json(outlet);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const outlet = await service.updateOutlet(req.params.id, req.body);
  res.json(outlet);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteOutlet(req.params.id);
  res.status(204).send();
});
