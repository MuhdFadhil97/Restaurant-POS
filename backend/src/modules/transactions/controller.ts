import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listTransactions(req.query as any));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getTransaction(Number(req.params.id)));
});

export const createDraft = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.status(201).json(await service.createDraft(user.userId, req.body));
});

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.status(201).json(await service.checkout(user.userId, req.body));
});

export const finalize = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.json(await service.finalize(Number(req.params.id), user.userId, req.body));
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.addItem(Number(req.params.id), req.body));
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateItem(Number(req.params.id), Number(req.params.itemId), req.body));
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.removeItem(Number(req.params.id), Number(req.params.itemId)));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateTransaction(Number(req.params.id), req.body));
});

export const voidTransaction = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.json(await service.voidTransaction(Number(req.params.id), user.userId, user.role, req.body));
});

export const refundTransaction = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.json(await service.refundTransaction(Number(req.params.id), user.userId, user.role, req.body));
});
