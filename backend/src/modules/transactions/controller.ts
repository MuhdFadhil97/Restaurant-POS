import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";
import { printAfterSale } from "../printJobs/receipts";
import { sendToKitchenSafely } from "../printJobs/kitchen";

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
  const draft = await service.createDraft(user.userId, req.body);
  if (req.body.sendToKitchen) await sendToKitchenSafely(draft.id, user.userId);
  res.status(201).json(draft);
});

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const transaction = await service.checkout(user.userId, req.body);
  // Printing happens after the sale has committed and never fails the request.
  // A walk-in sale goes to the kitchen as it's paid.
  await sendToKitchenSafely(transaction.id, user.userId);
  res.status(201).json({ ...transaction, ...(await printAfterSale(transaction.id, req.body.terminalId, user.userId)) });
});

export const finalize = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const transaction = await service.finalize(Number(req.params.id), user.userId, req.body);
  // Anything added to the tab since the last "Send to kitchen" goes now.
  await sendToKitchenSafely(transaction.id, user.userId);
  res.json({ ...transaction, ...(await printAfterSale(transaction.id, req.body.terminalId, user.userId)) });
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.addItem(Number(req.params.id), req.body));
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateItem(Number(req.params.id), Number(req.params.itemId), req.body, req.user?.userId));
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.removeItem(Number(req.params.id), Number(req.params.itemId), req.user?.userId));
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
