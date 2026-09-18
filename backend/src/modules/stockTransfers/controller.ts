import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listTransfers(req.query as any));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getTransfer(Number(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.status(201).json(await service.createTransfer(user.userId, req.body));
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.cancelTransfer(Number(req.params.id)));
});

export const send = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.json(await service.sendTransfer(Number(req.params.id), user.userId));
});

export const receive = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.json(await service.receiveTransfer(Number(req.params.id), user.userId));
});
