import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listAuditLogs(req.query as any));
});
