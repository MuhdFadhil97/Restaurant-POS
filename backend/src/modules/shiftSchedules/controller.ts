import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listStaffForOutlet(Number(req.query.outletId)));
});

export const listForMonth = asyncHandler(async (req: Request, res: Response) => {
  const { outletId, month } = req.query as unknown as { outletId: number; month: string };
  res.json(await service.listShiftSchedulesForMonth(outletId, month));
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as { from: string; to: string };
  res.json(await service.listMySchedules(req.user!.userId, from, to));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createShiftSchedule(req.user!.userId, req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateShiftSchedule(Number(req.params.id), req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteShiftSchedule(Number(req.params.id));
  res.status(204).send();
});
