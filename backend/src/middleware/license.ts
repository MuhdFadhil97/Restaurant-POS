import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/apiError";
import { getLicenseStatus } from "../lib/license";

// Paths that must keep working even when the license is restricted — otherwise
// nobody could ever find out *why* the system is locked, or renew it.
const EXEMPT_PATH_PREFIXES = ["/api/license", "/api/auth/login", "/health"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Global gate: once a license is restricted (missing/invalid, or expired past
// the grace period), block anything that changes data. Reads still work so
// staff can still see historical sales/reports/print old receipts — this is
// deliberately a "no new business" lock, not a full outage, since a hard
// crash-on-boot for a paying client over an expired license is a worse
// failure mode than a temporarily read-only POS.
export function requireValidLicense(req: Request, _res: Response, next: NextFunction) {
  if (EXEMPT_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  const status = getLicenseStatus();
  if (status.restricted && !SAFE_METHODS.has(req.method)) {
    throw ApiError.licenseRestricted(status.message);
  }
  next();
}

export async function enforceOutletLimit(_req: Request, _res: Response, next: NextFunction) {
  const status = getLicenseStatus();
  if (!status.payload) return next(); // dev bypass, or already blocked by requireValidLicense above

  const count = await prisma.outlet.count({ where: { deletedAt: null } });
  if (count >= status.payload.maxOutlets) {
    throw ApiError.forbidden(
      `This license allows up to ${status.payload.maxOutlets} outlet(s). Contact your POS provider to upgrade your plan.`
    );
  }
  next();
}

export async function enforceUserLimit(_req: Request, _res: Response, next: NextFunction) {
  const status = getLicenseStatus();
  if (!status.payload) return next();

  const count = await prisma.user.count({ where: { deletedAt: null } });
  if (count >= status.payload.maxUsers) {
    throw ApiError.forbidden(
      `This license allows up to ${status.payload.maxUsers} user(s). Contact your POS provider to upgrade your plan.`
    );
  }
  next();
}
