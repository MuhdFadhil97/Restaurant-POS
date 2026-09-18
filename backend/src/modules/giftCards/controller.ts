import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listGiftCards());
});

export const lookup = asyncHandler(async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) throw ApiError.badRequest("code query param is required");
  res.json(await service.getGiftCardByCode(code));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createGiftCard(req.body));
});

export const adjust = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.adjustGiftCard(req.params.id, req.body));
});
