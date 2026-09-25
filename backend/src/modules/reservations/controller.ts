import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listReservations(req.query as any));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getReservation(Number(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createReservation(req.body));
});

export const createPublic = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createPublicReservation(Number(req.params.outletId), req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateReservation(Number(req.params.id), req.body));
});

export const confirm = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.confirmReservation(Number(req.params.id), req.body.tableId));
});

export const seat = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.seatReservation(Number(req.params.id), req.body));
});

export const complete = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.completeReservation(Number(req.params.id)));
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.cancelReservation(Number(req.params.id), req.body));
});

export const noShow = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.markNoShow(Number(req.params.id)));
});

export const collectDeposit = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.collectDeposit(Number(req.params.id), req.body.amount));
});
