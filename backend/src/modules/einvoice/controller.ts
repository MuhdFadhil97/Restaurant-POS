import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const verify = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.verify(req.params.uuid, req.params.longId));
});

export const downloadReceipt = asyncHandler(async (req: Request, res: Response) => {
  const { buffer, receiptNumber } = await service.getReceiptPdf(req.params.uuid, req.params.longId);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="receipt-${receiptNumber ?? req.params.uuid}.pdf"`);
  res.send(buffer);
});
