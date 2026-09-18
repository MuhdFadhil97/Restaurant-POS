import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";
import { ReportQuery } from "./validation";

export const summary = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.salesSummary(req.query as unknown as ReportQuery));
});

export const topProducts = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.topProducts(req.query as unknown as ReportQuery));
});

export const byCashier = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.salesByCashier(req.query as unknown as ReportQuery));
});

export const byPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.salesByPaymentMethod(req.query as unknown as ReportQuery));
});
