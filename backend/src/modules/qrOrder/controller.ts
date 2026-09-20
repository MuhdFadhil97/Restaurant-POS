import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const getMenu = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getMenu(req.params.token));
});

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getOrderStatus(req.params.token));
});

export const submitOrder = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.submitOrder(req.params.token, req.body.items));
});
