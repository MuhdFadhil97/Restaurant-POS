import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listPurchaseOrders(req.query as any));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getPurchaseOrder(Number(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.status(201).json(await service.createPurchaseOrder(user.userId, req.body));
});

export const markOrdered = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.markOrdered(Number(req.params.id)));
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.cancelPurchaseOrder(Number(req.params.id)));
});

export const receive = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.json(await service.receivePurchaseOrder(Number(req.params.id), user.userId, req.body));
});
