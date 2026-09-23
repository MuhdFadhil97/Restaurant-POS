// Pure license-state logic — no env/config dependency, so it can be imported
// by standalone CLI tools (backend/scripts/license/*) as well as the running
// server (backend/src/lib/license.ts) without those tools needing a
// DATABASE_URL/JWT_SECRET just to compute a date difference.

export type PlanTier = "BASIC" | "PRO";

export interface LicensePayload {
  sub: string; // client id, e.g. a slug
  clientName: string;
  planTier: PlanTier;
  maxOutlets: number;
  maxUsers: number;
  iat: number;
  exp: number;
}

// The states a license derived from an exp timestamp can be in. The running
// server adds one more ("DEV_BYPASS", see license.ts) that only makes sense
// with env context, so it's not part of this pure computation.
export type ExpiryState = "OK" | "EXPIRING_SOON" | "GRACE_PERIOD" | "RESTRICTED";

export interface ExpiryStatus {
  state: ExpiryState;
  restricted: boolean;
  daysRemaining: number; // negative once past expiry
  message: string;
}

export const LICENSE_WARNING_WINDOW_DAYS = 14;
export const LICENSE_GRACE_PERIOD_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isLicensePayload(value: unknown): value is LicensePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sub === "string" &&
    typeof v.clientName === "string" &&
    (v.planTier === "BASIC" || v.planTier === "PRO") &&
    typeof v.maxOutlets === "number" &&
    typeof v.maxUsers === "number" &&
    typeof v.exp === "number"
  );
}

export function computeExpiryStatus(expSeconds: number, now: number = Date.now()): ExpiryStatus {
  const daysRemaining = Math.ceil((expSeconds * 1000 - now) / MS_PER_DAY);

  if (daysRemaining < -LICENSE_GRACE_PERIOD_DAYS) {
    return {
      state: "RESTRICTED",
      restricted: true,
      daysRemaining,
      message: `License expired ${Math.abs(daysRemaining)} days ago. New sales and edits are disabled until it's renewed.`,
    };
  }

  if (daysRemaining < 0) {
    const daysLeftInGrace = LICENSE_GRACE_PERIOD_DAYS + daysRemaining;
    return {
      state: "GRACE_PERIOD",
      restricted: false,
      daysRemaining,
      message: `License expired ${Math.abs(daysRemaining)} day(s) ago. Renew within ${daysLeftInGrace} day(s) to avoid disruption.`,
    };
  }

  if (daysRemaining <= LICENSE_WARNING_WINDOW_DAYS) {
    return {
      state: "EXPIRING_SOON",
      restricted: false,
      daysRemaining,
      message: `License expires in ${daysRemaining} day(s). Renew soon to avoid disruption.`,
    };
  }

  return { state: "OK", restricted: false, daysRemaining, message: "License active." };
}
