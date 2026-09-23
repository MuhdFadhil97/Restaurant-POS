import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { computeExpiryStatus, isLicensePayload, LicensePayload } from "./licenseState";

// See backend/docs/LICENSING.md for the full design and how to issue a
// license with backend/scripts/license/issue-license.ts.

export type { PlanTier, LicensePayload } from "./licenseState";
export { LICENSE_WARNING_WINDOW_DAYS, LICENSE_GRACE_PERIOD_DAYS } from "./licenseState";

export type LicenseState =
  | "OK" // valid, comfortably before expiry
  | "EXPIRING_SOON" // valid, inside the warning window
  | "GRACE_PERIOD" // past expiry but inside the grace window — still fully usable
  | "RESTRICTED" // missing/invalid/past the grace window — mutating requests are blocked
  | "DEV_BYPASS"; // no license configured, but NODE_ENV isn't "production"

export interface LicenseStatus {
  state: LicenseState;
  restricted: boolean;
  payload: LicensePayload | null;
  daysRemaining: number | null; // negative once past expiry
  message: string;
}

function decodeAndVerify(): LicensePayload | null {
  if (!env.licenseKey || !env.licensePublicKey) return null;
  try {
    // computeExpiryStatus() handles expiry/grace-period logic below, so
    // ignore the library's built-in expiry check and only trust the signature.
    const decoded = jwt.verify(env.licenseKey, env.licensePublicKey, {
      algorithms: ["RS256"],
      ignoreExpiration: true,
    });
    return isLicensePayload(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

// The license doesn't change while the process is running, so verify once
// and cache the result rather than re-checking the signature on every request.
let cachedPayload: LicensePayload | null | undefined;

function getPayload(): LicensePayload | null {
  if (cachedPayload === undefined) {
    cachedPayload = decodeAndVerify();
  }
  return cachedPayload;
}

export function getLicenseStatus(): LicenseStatus {
  const payload = getPayload();

  if (!payload) {
    if (env.nodeEnv !== "production") {
      return {
        state: "DEV_BYPASS",
        restricted: false,
        payload: null,
        daysRemaining: null,
        message: "No license configured — running unrestricted because NODE_ENV is not 'production'.",
      };
    }
    return {
      state: "RESTRICTED",
      restricted: true,
      payload: null,
      daysRemaining: null,
      message: "No valid license installed. Contact your POS provider to activate this system.",
    };
  }

  const expiry = computeExpiryStatus(payload.exp);
  return { ...expiry, payload };
}
