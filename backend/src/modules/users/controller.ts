import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listUsers());
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getUser(Number(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createUser(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  res.json(await service.updateUser(Number(req.params.id), req.body, req.user.userId));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteUser(Number(req.params.id));
  res.status(204).send();
});

export const revokeSessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await service.revokeSessions(Number(req.params.id), req.user.userId);
  res.status(204).send();
});

export const sendPasswordResetLink = asyncHandler(async (req: Request, res: Response) => {
  await service.sendPasswordResetLink(Number(req.params.id));
  res.status(204).send();
});
