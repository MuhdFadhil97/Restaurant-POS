import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { DashboardSummaryQuery } from "./validation";
import * as service from "./service";

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const { outletId } = req.query as unknown as DashboardSummaryQuery;
  res.json(await service.getSummary(outletId));
});
