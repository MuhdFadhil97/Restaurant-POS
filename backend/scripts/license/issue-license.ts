// Issues a signed license for one client deployment. Run by the vendor after
// payment is confirmed — see backend/docs/LICENSING.md.
//
// Usage:
//   npm run license:issue -- --client <slug> --name "<Client Business Name>" \
//     --plan BASIC|PRO --max-outlets <n> --max-users <n> --days <n> \
//     [--url <deployment base URL>] [--key <path-to-private-key>] [--out <path>]
//
// Example:
//   npm run license:issue -- --client kedai-kopi-ali --name "Kedai Kopi Ali" \
//     --plan PRO --max-outlets 3 --max-users 15 --days 365 \
//     --url https://kedaikopiali.yourapp.com
//
// --url is optional but recommended: recording it lets `npm run license:check`
// poll that deployment's live /api/license/status instead of only comparing
// against what was issued.
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { LicensePayload, PlanTier } from "../../src/lib/licenseState";
import { upsertClient } from "./registry";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    args[raw.slice(2)] = argv[i + 1] ?? "";
    i++;
  }
  return args;
}

function usage(): never {
  console.error(`Usage:
  npm run license:issue -- --client <slug> --name "<Client Business Name>" \\
    --plan BASIC|PRO --max-outlets <n> --max-users <n> --days <n> \\
    [--url <deployment base URL>] [--key <path-to-private-key>] [--out <path>]

Example:
  npm run license:issue -- --client kedai-kopi-ali --name "Kedai Kopi Ali" \\
    --plan PRO --max-outlets 3 --max-users 15 --days 365 \\
    --url https://kedaikopiali.yourapp.com
`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const required = ["client", "name", "plan", "max-outlets", "max-users", "days"];
if (required.some((flag) => !args[flag])) usage();

const planTier = args.plan.toUpperCase();
if (planTier !== "BASIC" && planTier !== "PRO") {
  console.error(`--plan must be BASIC or PRO, got "${args.plan}"`);
  process.exit(1);
}

const maxOutlets = Number(args["max-outlets"]);
const maxUsers = Number(args["max-users"]);
const days = Number(args.days);
if (!Number.isFinite(maxOutlets) || !Number.isFinite(maxUsers) || !Number.isFinite(days)) {
  console.error("--max-outlets, --max-users and --days must all be numbers.");
  process.exit(1);
}

const keyPath = args.key ?? path.join(__dirname, "../../keys/license-private-key.pem");
let privateKey: string;
try {
  privateKey = readFileSync(keyPath, "utf8");
} catch {
  console.error(`Could not read a private key at ${keyPath}.`);
  console.error("Run `npm run license:keygen` first, or pass --key <path>.");
  process.exit(1);
}

const iat = Math.floor(Date.now() / 1000);
const exp = iat + days * 86400;

const payload: LicensePayload = {
  sub: args.client,
  clientName: args.name,
  planTier: planTier as PlanTier,
  maxOutlets,
  maxUsers,
  iat,
  exp,
};

// exp is explicit on the payload above, so no expiresIn option here —
// jsonwebtoken rejects passing both at once.
const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });

console.log(`\nLicense for "${args.name}" (${planTier}, ${maxOutlets} outlet(s), ${maxUsers} user(s), ${days} days):\n`);
console.log(token);
console.log("\nSet this as the LICENSE_KEY env var on that client's deployment.");

if (args.out) {
  writeFileSync(args.out, token, "utf8");
  console.log(`Also written to ${args.out}`);
}

upsertClient({
  client: args.client,
  name: args.name,
  planTier: planTier as PlanTier,
  maxOutlets,
  maxUsers,
  issuedAt: new Date(iat * 1000).toISOString(),
  expiresAt: new Date(exp * 1000).toISOString(),
  deploymentUrl: args.url ?? null,
});
console.log(`\nRecorded in the local registry (backend/keys/registry.json). Run \`npm run license:check\` any time to review all clients.`);
if (!args.url) {
  console.log("No --url given, so the live check will be skipped for this client — pass --url next time to enable it.");
}
