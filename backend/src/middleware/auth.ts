import { NextFunction, Request, Response } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";
import { ApiError } from "../lib/apiError";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "./errorHandler";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Verifies the JWT, then checks it against the user's current DB state so a
// revoked/deactivated account or a bumped tokenVersion (role/module change,
// password change, or an explicit "force logout") is rejected immediately
// instead of only once the token naturally expires.
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing bearer token");
  }

  const token = header.slice("Bearer ".length);
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { isActive: true, deletedAt: true, tokenVersion: true },
  });
  if (!user || !user.isActive || user.deletedAt) {
    throw ApiError.unauthorized("Account is no longer active");
  }
  if (user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized("Session has been revoked, please log in again");
  }

  req.user = payload;
  next();
});

// Ensures the outletId referenced in the request (params, query, or body)
// is one the authenticated user has access to. Admins bypass this check.
export function requireOutletAccess(getOutletId: (req: Request) => number | undefined) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const outletId = getOutletId(req);
    if (!outletId) {
      throw ApiError.badRequest("outletId is required");
    }
    if (req.user?.role === "ADMIN") {
      return next();
    }
    if (!req.user?.outletIds.includes(outletId)) {
      throw ApiError.forbidden("No access to this outlet");
    }
    next();
  };
}
