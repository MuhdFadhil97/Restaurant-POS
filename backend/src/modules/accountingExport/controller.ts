import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import { optionalIdQuery } from "../../lib/query";
import * as service from "./service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const outletId = optionalIdQuery(req.query.outletId);
  if (!outletId) throw ApiError.badRequest("outletId is required");
  res.json(await service.listRuns(outletId));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const run = await service.generateRun(req.body, req.user!.userId);
  res.status(201).json(run);
});

export const download = asyncHandler(async (req: Request, res: Response) => {
  const { buffer, run } = await service.getRunFile(Number(req.params.id));
  if (req.user!.role !== "ADMIN" && !req.user!.outletIds.includes(run.outletId)) {
    throw ApiError.forbidden("No access to this outlet");
  }
  const filename = `accounting-export-${run.format.toLowerCase()}-${req.params.id}.csv`;
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
});
