import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listCampaigns());
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getCampaign(Number(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createCampaign(req.body, req.user!.userId));
});

export const send = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.sendCampaign(Number(req.params.id)));
});

export const pause = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.pauseCampaign(Number(req.params.id)));
});

export const resume = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.resumeCampaign(Number(req.params.id)));
});
