import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import { optionalIdQuery } from "../../lib/query";
import * as service from "./service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const outletId = optionalIdQuery(req.query.outletId);
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  res.json(await service.listBridges(outletId));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createBridge(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateBridge(Number(req.params.id), req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteBridge(Number(req.params.id));
  res.status(204).send();
});

export const regenerateToken = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.regenerateBridgeToken(Number(req.params.id)));
});

// ── Agent-facing ──────────────────────────────────────────────────────────

export const claimJobs = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.claimJobsForBridge(req.bridge!.id, optionalIdQuery(req.query.limit)));
});

export const ackJob = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.ackJobForBridge(req.bridge!.id, Number(req.params.id), req.body));
});
