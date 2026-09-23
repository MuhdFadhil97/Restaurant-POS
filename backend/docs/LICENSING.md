# Licensing

Each client runs their own isolated deployment of this app (own database, own
backend, own frontend — see the SaaS roadmap plan). Activation and plan-tier
enforcement (Basic vs. Pro, outlet/user limits) are done with a signed
**license key** per deployment rather than a central billing service, which
keeps the first several clients simple to onboard without building out
subscription infrastructure.

## How it works

- The vendor holds one RSA keypair, generated once with `npm run license:keygen`.
  - `license-private-key.pem` stays only on the vendor's machine. It signs licenses.
  - `license-public-key.pem` ships to **every** client deployment. It can verify a
    license but can never forge one.
- For each client, the vendor runs `npm run license:issue -- ...` to produce a
  signed token (a JWT, algorithm RS256) encoding `{ clientId, clientName,
  planTier, maxOutlets, maxUsers, expiresAt }`.
- That token is set as the `LICENSE_KEY` env var on the client's deployment;
  the vendor's public key is set as `LICENSE_PUBLIC_KEY`.
- The backend verifies the license on every request (`backend/src/lib/license.ts`)
  and:
  - blocks anything that changes data (`requireValidLicense` in
    `backend/src/middleware/license.ts`) once the license is missing, invalid,
    or more than 14 days past its expiry date — reads (dashboard, reports,
    past transactions) keep working so a lapsed client isn't fully locked out
    of their own data;
  - enforces `maxOutlets`/`maxUsers` when creating a new outlet or user
    (`enforceOutletLimit` / `enforceUserLimit`), wired into the relevant
    `POST` routes;
  - exposes `GET /api/license/status` (no auth required) so the frontend can
    explain what's happening and show a renewal banner well before expiry.

## Local development

Leave `LICENSE_KEY` / `LICENSE_PUBLIC_KEY` unset. The app runs fully
unrestricted whenever `NODE_ENV` isn't `production` (see `DEV_BYPASS` state in
`getLicenseStatus()`), so this never gets in the way of local dev or tests.

## Issuing a license for a new client

```bash
# One-time, on the vendor's machine only:
npm run license:keygen

# For each new client, after payment is confirmed:
npm run license:issue -- \
  --client kedai-kopi-ali \
  --name "Kedai Kopi Ali" \
  --plan PRO \
  --max-outlets 3 \
  --max-users 15 \
  --days 365 \
  --url https://kedaikopiali.yourapp.com
```

This prints the signed token — set it as `LICENSE_KEY` on that client's
backend deployment, along with `LICENSE_PUBLIC_KEY` (the contents of
`keys/license-public-key.pem`, the same value for every client). `--url` is
optional but recommended: it lets `license:check` (below) poll that
deployment's live status instead of only trusting what was issued.

## Monitoring all clients

Every `license:issue` run records the client into a local registry
(`backend/keys/registry.json` — gitignored, vendor-machine-only). To see the
health of every client at a glance:

```bash
npm run license:check
```

For each client this prints the state expected from what you issued
(`OK`/`EXPIRING_SOON`/`GRACE_PERIOD`/`RESTRICTED`), and — if a `--url` was
recorded — the *live* state reported by that deployment's own
`GET /api/license/status`. A mismatch between the two usually means the wrong
`LICENSE_KEY` got deployed, or the deployment is unreachable. It also writes
`backend/keys/last-check.json`, a machine-readable summary of the same data.

This is a pull, not a push: nothing polls your clients on its own, and there
is no central server that clients report into (deliberately — see the SaaS
roadmap plan on why this stays a per-client-deployment model). Run
`license:check` whenever you want fresh numbers, or ask Claude to run it and
refresh your license dashboard artifact from `last-check.json`.

## Renewing or upgrading a client

Run `license:issue` again with the same `--client` id and the new
`--max-outlets` / `--max-users` / `--days`, and update the `LICENSE_KEY` env
var on that client's deployment. There's no revocation list — the old token
simply stops being used once replaced; it would still verify (the signature
never expires), so don't rely on the old token becoming unusable, just stop
distributing it.

## States

| State | Meaning | Writes allowed? |
|---|---|---|
| `OK` | Valid, more than 14 days from expiry | Yes |
| `EXPIRING_SOON` | Valid, within 14 days of expiry | Yes |
| `GRACE_PERIOD` | Expired, but within 14 days past expiry | Yes |
| `RESTRICTED` | Missing/invalid, or more than 14 days past expiry | No — reads only |
| `DEV_BYPASS` | No license configured and `NODE_ENV` isn't `production` | Yes |

The warning window and grace period are both 14 days
(`LICENSE_WARNING_WINDOW_DAYS`, `LICENSE_GRACE_PERIOD_DAYS` in
`backend/src/lib/license.ts`) — adjust there if needed.
