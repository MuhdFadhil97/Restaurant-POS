import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/apiError";
import { asyncHandler } from "./errorHandler";

export interface BridgeIdentity {
  id: number;
  outletId: number;
}

declare global {
  namespace Express {
    interface Request {
      bridge?: BridgeIdentity;
    }
  }
}

export function hashBridgeToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Bearer-token auth for the print-bridge agent — a separate identity space
// from staff JWTs (req.user), since a bridge runs unattended on a machine in
// the restaurant, not as a logged-in user.
//
// Wrapped with asyncHandler at definition (not left to each call site to
// remember): an async middleware that throws instead of calling next(err)
// rejects a promise Express never awaits, which crashes the whole process
// with an unhandled rejection rather than returning a 401. Found the hard
// way — see the 2026-09-24 memory.md entry.
async function authenticateBridgeHandler(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing bridge token");
  }
  const token = header.slice("Bearer ".length);
  const bridge = await prisma.printBridge.findFirst({
    where: { tokenHash: hashBridgeToken(token), deletedAt: null },
    select: { id: true, outletId: true },
  });
  if (!bridge) {
    throw ApiError.unauthorized("Invalid or revoked bridge token");
  }
  req.bridge = bridge;
  // Piggy-back the heartbeat on every authenticated call rather than a
  // separate endpoint — a polling agent calls this every few seconds anyway.
  prisma.printBridge.update({ where: { id: bridge.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  next();
}
export const authenticateBridge = asyncHandler(authenticateBridgeHandler);
