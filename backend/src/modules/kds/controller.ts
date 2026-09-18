import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const queue = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getQueue(req.query as any));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updatePrepStatus(req.params.itemId, req.body.prepStatus));
});
