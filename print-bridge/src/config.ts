import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  }
  return value;
}

export const config = {
  apiUrl: required("API_URL").replace(/\/+$/, ""),
  bridgeToken: required("BRIDGE_TOKEN"),
  pollMs: Number(process.env.POLL_MS ?? 3000),
};
