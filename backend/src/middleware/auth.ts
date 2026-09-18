import { NextFunction, Request, Response } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";
import { ApiError } from "../lib/apiError";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing bearer token");
  }

  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }
}

// Ensures the outletId referenced in the request (params, query, or body)
// is one the authenticated user has access to. Admins bypass this check.
export function requireOutletAccess(getOutletId: (req: Request) => string | undefined) {
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
