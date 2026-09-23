import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { getLicenseStatus } from "../../lib/license";

// Intentionally unauthenticated: the frontend needs this to explain *why*
// the app is locked even when every other request is being rejected, and
// none of it is sensitive business data.
export const status = asyncHandler(async (_req: Request, res: Response) => {
  const s = getLicenseStatus();
  res.json({
    state: s.state,
    restricted: s.restricted,
    message: s.message,
    daysRemaining: s.daysRemaining,
    clientName: s.payload?.clientName ?? null,
    planTier: s.payload?.planTier ?? null,
    maxOutlets: s.payload?.maxOutlets ?? null,
    maxUsers: s.payload?.maxUsers ?? null,
    expiresAt: s.payload ? new Date(s.payload.exp * 1000).toISOString() : null,
  });
});
