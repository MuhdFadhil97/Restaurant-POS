import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Some hosts only support single-line env vars, so a multi-line PEM is often
// pasted in with literal "\n" sequences instead of real newlines. Normalize
// either form.
function normalizePem(value: string | undefined): string | undefined {
  return value?.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim()),
  // See backend/docs/LICENSING.md. Both are optional in non-production envs —
  // the app runs unrestricted when neither is set and NODE_ENV isn't "production".
  licenseKey: process.env.LICENSE_KEY,
  licensePublicKey: normalizePem(process.env.LICENSE_PUBLIC_KEY),
  // Public frontend URL (same value as the frontend's VITE_PUBLIC_URL). Only
  // used to print the e-Invoice QR on thermal receipts; optional.
  publicAppUrl: process.env.PUBLIC_APP_URL?.replace(/\/+$/, ""),
  // Time zone for times printed on thermal receipts/tickets.
  appTimeZone: process.env.APP_TIMEZONE ?? "Asia/Kuala_Lumpur",
};
