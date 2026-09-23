// A local record of every license the vendor has issued, kept purely for
// monitoring (backend/scripts/license/check-clients.ts) — it is not read by
// the running app and carries no authority; the signed token itself is what
// each deployment actually trusts. Lives in keys/ so it's gitignored
// alongside the signing keys (business-confidential: client names, plans).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { PlanTier } from "../../src/lib/licenseState";

export interface RegistryEntry {
  client: string;
  name: string;
  planTier: PlanTier;
  maxOutlets: number;
  maxUsers: number;
  issuedAt: string; // ISO
  expiresAt: string; // ISO
  deploymentUrl: string | null;
}

export const REGISTRY_PATH = path.join(__dirname, "../../keys/registry.json");

export function loadRegistry(): Record<string, RegistryEntry> {
  if (!existsSync(REGISTRY_PATH)) return {};
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  } catch {
    console.error(`Warning: could not parse ${REGISTRY_PATH} — treating it as empty.`);
    return {};
  }
}

export function upsertClient(entry: RegistryEntry): void {
  const registry = loadRegistry();
  registry[entry.client] = entry;
  mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}
