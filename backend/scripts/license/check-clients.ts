// Monitors every license the vendor has issued: for each client recorded in
// the local registry, computes the expected state from the recorded expiry
// and — if a deployment URL was recorded — polls that deployment's live
// GET /api/license/status so a misconfigured or unreachable client shows up
// as a mismatch instead of silently looking fine.
//
// Usage:
//   npm run license:check
import { writeFileSync } from "fs";
import path from "path";
import { computeExpiryStatus } from "../../src/lib/licenseState";
import { loadRegistry, RegistryEntry } from "./registry";

interface LiveCheck {
  checked: boolean;
  reachable: boolean;
  state?: string;
  error?: string;
}

async function checkLive(url: string): Promise<LiveCheck> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${url.replace(/\/+$/, "")}/api/license/status`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { checked: true, reachable: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { state?: string };
    return { checked: true, reachable: true, state: data.state };
  } catch (err) {
    return { checked: true, reachable: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkOne(entry: RegistryEntry) {
  const expSeconds = Math.floor(new Date(entry.expiresAt).getTime() / 1000);
  const local = computeExpiryStatus(expSeconds);
  const live = entry.deploymentUrl ? await checkLive(entry.deploymentUrl) : { checked: false, reachable: false };

  const mismatch = live.checked && live.reachable && live.state !== local.state;

  return {
    client: entry.client,
    name: entry.name,
    planTier: entry.planTier,
    maxOutlets: entry.maxOutlets,
    maxUsers: entry.maxUsers,
    expiresAt: entry.expiresAt,
    deploymentUrl: entry.deploymentUrl,
    expectedState: local.state,
    daysRemaining: local.daysRemaining,
    message: local.message,
    live,
    mismatch,
  };
}

async function main() {
  const registry = loadRegistry();
  const entries = Object.values(registry);

  if (entries.length === 0) {
    console.log("No clients recorded yet. Run `npm run license:issue` (with --url) to track one.");
    return;
  }

  const results = await Promise.all(entries.map(checkOne));
  results.sort((a, b) => a.daysRemaining - b.daysRemaining);

  console.table(
    results.map((r) => ({
      client: r.name,
      plan: r.planTier,
      expected: r.expectedState,
      daysLeft: r.daysRemaining,
      expires: r.expiresAt.slice(0, 10),
      live: !r.deploymentUrl ? "no URL recorded" : r.live.reachable ? r.live.state : `unreachable (${r.live.error})`,
      mismatch: r.mismatch ? "⚠ YES" : "",
    }))
  );

  const attention = results.filter((r) => r.expectedState !== "OK" || r.mismatch || (r.deploymentUrl && !r.live.reachable));
  if (attention.length > 0) {
    console.log(`\n${attention.length} client(s) need attention:`);
    for (const r of attention) {
      const notes: string[] = [];
      if (r.expectedState !== "OK") notes.push(r.message);
      if (r.mismatch) notes.push("live status disagrees with what was issued — check LICENSE_KEY on that deployment");
      if (r.deploymentUrl && !r.live.reachable) notes.push(`deployment unreachable (${r.live.error})`);
      console.log(`  - ${r.name}: ${notes.join("; ")}`);
    }
  } else {
    console.log("\nAll clients healthy.");
  }

  const outPath = path.join(__dirname, "../../keys/last-check.json");
  writeFileSync(outPath, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nFull summary written to ${outPath}`);
}

main();
