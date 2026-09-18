import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listGrns(req.query as any));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getGrn(Number(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.status(201).json(await service.createGrn(user.userId, req.body));
});
