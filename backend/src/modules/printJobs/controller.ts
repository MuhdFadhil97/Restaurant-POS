import { Request, Response } from "express";
import { PrintJobStatus } from "@prisma/client";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import { optionalIdQuery } from "../../lib/query";
import * as service from "./service";
import * as receipts from "./receipts";
import * as kitchen from "./kitchen";
import { prisma } from "../../lib/prisma";
import { assertOutletAccess } from "../../lib/outletAccess";

const STATUSES = new Set<string>(Object.values(PrintJobStatus));

export const list = asyncHandler(async (req: Request, res: Response) => {
  const outletId = optionalIdQuery(req.query.outletId);
  if (!outletId) throw ApiError.badRequest("outletId query param is required");
  const status = typeof req.query.status === "string" && STATUSES.has(req.query.status)
    ? (req.query.status as PrintJobStatus)
    : undefined;
  res.json(await service.listPrintJobs({ outletId, status, limit: optionalIdQuery(req.query.limit) }));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getPrintJob(Number(req.params.id), req.user));
});

export const retry = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.retryPrintJob(Number(req.params.id), req.user));
});

export const reprintReceipt = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await receipts.reprintReceipt(req.body.transactionId, req.body.terminalId, req.user));
});

export const sendToKitchen = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await prisma.transaction.findUnique({ where: { id: req.body.transactionId } });
  if (!transaction) throw ApiError.notFound("Transaction not found");
  assertOutletAccess(req.user, transaction.outletId);
  if (transaction.status !== "OPEN" && transaction.status !== "HELD") {
    throw ApiError.badRequest("Only open or held orders can be sent to the kitchen");
  }
  res.status(201).json(await kitchen.sendToKitchen(transaction.id, req.user?.userId ?? null));
});
