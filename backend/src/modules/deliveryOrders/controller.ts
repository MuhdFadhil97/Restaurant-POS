import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { ApiError } from "../../lib/apiError";
import * as service from "./service";

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const platformId = Number(req.params.platformId);
  const signature = req.header("X-Webhook-Signature");
  if (!req.rawBody) throw ApiError.badRequest("Missing request body");
  await service.ingestWebhook(platformId, req.rawBody, signature);
  // Ack fast/generic — platforms retry on anything but 2xx, and our own
  // processing errors shouldn't leak internal detail to a third party.
  res.status(200).json({ received: true });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listOrders(req.query as any));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getOrder(Number(req.params.id)));
});

export const accept = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.acceptOrder(Number(req.params.id)));
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.rejectOrder(Number(req.params.id), req.body.reason));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateOrderStatus(Number(req.params.id), req.body.status));
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.archiveOrder(Number(req.params.id)));
});
