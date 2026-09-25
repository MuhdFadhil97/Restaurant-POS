import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listSegments());
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createSegment(req.body, req.user!.userId));
});

export const preview = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.previewSegment(Number(req.params.id)));
});
