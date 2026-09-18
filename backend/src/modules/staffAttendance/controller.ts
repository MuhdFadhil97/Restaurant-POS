import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const current = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getCurrentAttendance(req.user!.userId));
});

export const clockIn = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.clockIn(req.user!.userId, req.body));
});

export const startBreak = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.startBreak(req.user!.userId));
});

export const endBreak = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.endBreak(req.user!.userId));
});

export const clockOut = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.clockOut(req.user!.userId));
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as { from: string; to: string };
  res.json(await service.listMyAttendance(req.user!.userId, from, to));
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { outletId, from, to } = req.query as unknown as { outletId: number; from: string; to: string };
  res.json(await service.listAttendance(outletId, from, to));
});

export const correct = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.correctAttendance(req.user!.userId, Number(req.params.id), req.body));
});
