# Hardware Module

Receipt printers, kitchen/bar ticket printers, the cash drawer, and a
customer-facing display. For how to *configure* this at a restaurant, see
[`HARDWARE_SETUP.md`](../../HARDWARE_SETUP.md) at the repo root — this doc is
for working on the code itself.

## Core design: one print-job queue, three delivery transports

Every print — a receipt, a kitchen ticket, a drawer kick, a test page — is
rendered to ESC/POS bytes exactly once and stored as a `PrintJob` row
(`payload Bytes`). How those bytes reach the physical printer depends on the
printer's `connection`:

| `connection` | Who delivers the job | Code |
|---|---|---|
| `NETWORK_DIRECT` | The backend itself, over a raw TCP socket to `host:port` (port 9100 is the de-facto standard for network thermal printers). | `lib/printing/dispatcher.ts` polls every 3s. |
| `NETWORK_BRIDGE` | An on-site agent (`../../print-bridge/`), for when the backend is hosted off-site. | `modules/printBridge/` — token-authenticated `GET /jobs` claim, `POST /jobs/:id/ack`. |
| `TERMINAL_LOCAL` | The terminal's own browser, for a USB/serial printer plugged into that specific till. | `modules/printJobs/` — JWT-authenticated `GET /terminal/:id` claim, `POST /:id/ack`. |

All three share the same queue primitives in `lib/printing/queue.ts`:

- `enqueue()` creates a `PENDING` job.
- `claim()` / `claimPending()` atomically flip `PENDING → CLAIMED` via
  `updateMany({ where: { status: "PENDING" } })`, so two claimers (a bridge
  and the dispatcher's next tick, say) can never deliver the same job twice.
- `ack()` records the outcome: `PRINTED`, or back to `PENDING` for another
  try (up to `MAX_ATTEMPTS = 3`, then `FAILED`).
- `requeueStale()` resets a job stuck in `CLAIMED` for more than
  `STALE_CLAIM_MS` (60s) — covers a bridge or browser tab that claimed a job
  and then crashed/closed before acking it. The direct-printer dispatcher
  calls this every tick regardless of connection type, so it covers all three
  transports even though it only *delivers* `NETWORK_DIRECT` jobs itself.

Printing is **fire-and-forget from the caller's point of view**: `enqueue()`
is always called *after* the triggering DB transaction (a sale, a kitchen
send) has committed, and a printing failure is reported back on the response
but never rolls back or blocks the underlying action.

## Data model

```
Terminal ──┬─ receiptPrinter → Printer (this terminal's till-side printer)
           └─ localPrinters  → Printer[] (TERMINAL_LOCAL printers plugged into it)

Printer ──┬─ bridge  → PrintBridge (for NETWORK_BRIDGE)
          └─ hostTerminal → Terminal (for TERMINAL_LOCAL)

PrintJob → outlet, printer, transaction? (for receipts/tickets), createdBy?
KitchenStation → printer (optional; no printer = Kitchen Display only)
```

- `Terminal`: a named device ("Counter 1"), not a person. Identified per
  browser in `localStorage` (`frontend/src/store/terminalStore.ts`), keyed by
  outlet — a device can be a different terminal at a different outlet.
  Carries `cashDrawerEnabled` and `customerDisplayMode` +
  `displayToken` (unique, powers the public `/display/:token` page).
- `Printer`: one row per physical printer, whichever `connection` it uses.
  `paperWidth`/`charsPerLine` drive layout in the ESC/POS templates.
- `PrintBridge`: `tokenHash` only — the plaintext token is generated once
  (`pbk_...` prefix) and shown to the user exactly once, at creation or
  regeneration. See `hashBridgeToken()` in `middleware/bridgeAuth.ts`.
- `PrintJob`: `kind` is `RECEIPT | KITCHEN_TICKET | DRAWER_KICK | TEST`.
- `TransactionItem.kitchenPrintedAt`: see [Kitchen tickets](#kitchen-tickets)
  below — this is how "don't print the same item twice" is enforced without
  a separate ticket-tracking table.

## ESC/POS rendering

`lib/printing/encoder.ts` wraps `node-thermal-printer` purely as a byte
builder (`getBuffer()`, never `execute()` — nothing here ever opens its own
connection to a printer; that's the transports' job).

**`node-thermal-printer`'s `openCashDrawer()` is broken for real
printers** — it emits `ESC p m` without the required timing bytes, so a real
printer interprets the next two bytes of the job (often the cut command) as
timing parameters instead. `DRAWER_KICK` in `encoder.ts` is the correct
5-byte `ESC p 0 25 250` sequence, built by hand. Don't switch back to the
library's version.

Templates: `templates/receipt.ts`, `templates/kitchenTicket.ts`,
`templates/testPage.ts`. The receipt template is a line-for-line port of
`frontend/src/features/transactions/Receipt.tsx` — keep them in sync when the
receipt layout changes. `formatPrintTime`/`formatPrintClock` (in
`receipt.ts`) use `env.appTimeZone` (`APP_TIMEZONE`, default
`Asia/Kuala_Lumpur`) so printed times don't depend on the server's own
timezone.

## Kitchen tickets

`modules/printJobs/kitchen.ts`. `sendToKitchen()` claims unsent items by
stamping every `TransactionItem` on the order with `kitchenPrintedAt = now`
in one `updateMany`, then reads back exactly the rows carrying that
timestamp. This is the whole double-print guard: `updateMany` has no
`RETURNING`, so claiming-then-reading (rather than reading-then-updating) is
what makes two near-simultaneous sends (or a send racing checkout) safe.

Because a sent line's quantity is now "what the kitchen is making":

- Raising the quantity on an already-sent line splits the extra into a
  **new**, unsent line (`transactions/service.ts`, `updateItem`) — so the
  next send only prints the delta, as an "ADDITIONAL ORDER" ticket.
- Lowering it, or removing the line, prints a `CANCELLED` ticket for the
  difference (`printKitchenCancellation`).

Triggers: `createDraft` with `sendToKitchen: true` (Send to Table),
`checkout`, `finalize` (catches anything added since the last send),
`createOrAppendQrOrder` (self-orders skip the cashier entirely), and the
explicit `POST /print-jobs/kitchen`. All of these call
`sendToKitchenSafely()`, which swallows printing errors — a kitchen printer
being offline must never block a sale or a table order.

`kitchen.ts` **must not import `transactions/service.ts`** — that module
imports `kitchen.ts` for cancellation tickets, so the dependency only runs
one way.

## Customer display

`modules/customerDisplay/`. State (`{status, lines, totals}` per terminal) is
an **in-memory `Map`, not a database table** (`store.ts`) — it's "what's
currently in the cart," ephemeral by nature, not worth persisting through a
restart.

- `SAME_DEVICE` mode never touches the backend: the POS page and the display
  page talk directly over a `BroadcastChannel` scoped to the terminal's id
  (same-origin, so it works across tabs/windows of the same browser).
- `REMOTE` mode debounces a `PUT` from the terminal to the backend, which
  fans it out to any open `/display/:token` connections over **Server-Sent
  Events** (`controller.stream`, one `EventEmitter` per terminal in
  `store.ts`).
- The public `/display/:token` page resolves its terminal via
  `GET /customer-display/token/:token` — deliberately unfiltered by
  `customerDisplayMode`, so the page itself can decide which transport to
  open. The `PUT`/stream endpoints stay mode-specific (`PUT` requires
  `REMOTE`).

## Two gotchas worth knowing before you touch this code

**Async Express middleware that `throw`s instead of calling `next(err)`
crashes the entire process**, not just the request — Express only
auto-catches *synchronous* throws in middleware. An `async function` that
throws rejects a promise nobody awaits; that becomes an unhandled rejection
and kills the whole Node process on the very next occurrence. This bit both
`authenticateBridge` (new, in this module) and — discovered the same day —
`enforceOutletLimit`/`enforceUserLimit` (pre-existing, in
`middleware/license.ts`, would crash on a client hitting their license's
outlet/user limit). All three are now wrapped with `asyncHandler` **at their
definition**, not left to each call site to remember. Any new async
middleware (as opposed to a controller — those already always go through
`asyncHandler`) needs the same treatment; `tests/asyncMiddlewareSafety.test.ts`
guards the three existing ones.

**WebSerial and WebUSB (`frontend/src/lib/hardware/localPrinter.ts`) are
secure-context-only APIs.** `navigator.serial`/`navigator.usb` are simply
`undefined` on a page loaded over plain `http://<lan-ip>` — only `https://`
or `http://localhost` exposes them. This is the same class of bug as an
earlier `crypto.randomUUID()` crash in `PosPage.tsx` (also secure-context
gated). Every entry point feature-detects (`isWebSerialSupported`/
`isWebUsbSupported`) before touching either API, and the UI
(`LocalPrinterCard.tsx`) shows a plain message on an unsupported origin
instead of throwing. **A restaurant whose POS is reached over a plain LAN
address cannot use USB/serial terminal printers at all** — that's a real
deployment constraint, not just a dev-mode inconvenience; say so before
promising the feature to a client.

## Testing without hardware

`backend/scripts/fake-printer.ts` is a plain TCP server standing in for a
real printer — it saves every job's bytes to `fake-printer-output/` and
prints a decoded text preview to the console:

```bash
npx tsx scripts/fake-printer.ts 9100 9101   # one per "printer"
```

Point a `NETWORK_DIRECT` printer's host/port at it, or run the real
`print-bridge` agent against it for a `NETWORK_BRIDGE` printer — both paths
were verified this way, including the failure/retry cycle (stop the fake
printer mid-test, confirm `FAILED` after 3 attempts, restart it, confirm
`Retry` succeeds).

Unit tests (`backend/tests/`, Vitest): `printingEncoder`, `printingReceipt`,
`printingKitchenTicket` snapshot the rendered ESC/POS bytes;
`printJobsTerminalLocal` and `asyncMiddlewareSafety` cover authorization and
the crash-safety property above with a mocked Prisma client. There's no
frontend test runner in this project, so the browser-side pieces (device
banner, Hardware tab, local-printer pairing UI) are verified by driving a
real browser (Playwright) against the fake printer and a real
`print-bridge` process — see the session notes in `memory.md` for the
specific flows exercised.

**Not covered anywhere in this repo's tests: an actual paired USB/serial
printer**, or the Capacitor plugin the packaged Android app
(`../Restaurant-POS-android`, a separate clone) would need for the same
USB/Bluetooth capability — both require real hardware/a native Android build
this environment doesn't have.

## API Reference

All routes below are prefixed `/api` and, except where noted, require
`Authorization: Bearer <JWT>` like the rest of the app. Errors follow the
project-wide shape: `{ "error": { "message", "code", "details"? } }`.

### Terminals — `/terminals`

| Method & path | Notes |
|---|---|
| `GET /?outletId=` | List terminals for an outlet. |
| `GET /:id` | |
| `POST /` | ADMIN/MANAGER. `{ outletId, name, receiptPrinterId?, cashDrawerEnabled?, customerDisplayMode? }`. |
| `PATCH /:id` | ADMIN/MANAGER. Same fields, all optional, plus `isActive`. |
| `DELETE /:id` | ADMIN/MANAGER. Soft-delete; deactivates any `TERMINAL_LOCAL` printers hosted on it. |
| `POST /:id/heartbeat` | Any signed-in role. Updates `lastSeenAt` (drives the Online/Offline badge). |
| `POST /:id/drawer` | ADMIN/MANAGER/CASHIER. `{ reason? }` — a "no sale" drawer open, audited as `DRAWER_OPENED`. 400 if no drawer is connected. |
| `POST /:id/regenerate-display-token` | ADMIN/MANAGER. Invalidates the old `/display/:token` link. |

### Printers — `/printers`

| Method & path | Notes |
|---|---|
| `GET /?outletId=` | |
| `POST /` | ADMIN/MANAGER. `{ outletId, name, connection, host?, port?, bridgeId?, terminalId?, paperWidth?, charsPerLine? }` — required fields depend on `connection` (see table in `HARDWARE_SETUP.md`). |
| `PATCH /:id` | ADMIN/MANAGER. |
| `DELETE /:id` | ADMIN/MANAGER. Soft-delete; un-assigns it from any terminal/kitchen station, fails any of its still-pending jobs. |
| `POST /:id/test` | ADMIN/MANAGER. Queues a `TEST` job; poll `GET /print-jobs/:id` for the result. |

### Print Jobs — `/print-jobs`

| Method & path | Notes |
|---|---|
| `GET /?outletId=&status=&limit=` | `status` optional (`PENDING\|CLAIMED\|PRINTED\|FAILED`). |
| `GET /:id` | |
| `POST /:id/retry` | Any signed-in role. 409 if the job isn't currently `FAILED`. |
| `POST /receipt` | `{ transactionId, terminalId }` — reprints, marked `** REPRINT **` on the paper. |
| `POST /kitchen` | `{ transactionId }` — manual "Send to Kitchen"; 400 unless the order is `OPEN`/`HELD`. |
| `GET /terminal/:terminalId` | Claims pending `TERMINAL_LOCAL` jobs for that terminal's own printers (JWT-authenticated — this is the terminal's own signed-in session, not a bridge token). |
| `POST /:id/ack` | `{ ok, error? }` — for the claim above; 400 if the job isn't a `TERMINAL_LOCAL` print. |

### Print Bridges — `/print-bridges` (staff) and `/print-bridge` (agent)

| Method & path | Notes |
|---|---|
| `GET /print-bridges?outletId=` | ADMIN only. |
| `POST /print-bridges` | ADMIN. `{ outletId, name }` → `{ ...bridge, token }` — **token shown once.** |
| `PATCH /print-bridges/:id` | ADMIN. Rename. |
| `DELETE /print-bridges/:id` | ADMIN. Deactivates printers using it. |
| `POST /print-bridges/:id/regenerate-token` | ADMIN. Same one-time-token shape as create. |
| `GET /print-bridge/jobs` | **Bridge token** (`Authorization: Bearer pbk_...`), not a JWT. Claims pending jobs for this bridge's own printers. |
| `POST /print-bridge/jobs/:id/ack` | Bridge token. `{ ok, error? }`. |

### Customer Display — `/customer-display`

| Method & path | Notes |
|---|---|
| `PUT /:terminalId` | JWT. `{ status, lines, totals }` — `REMOTE` mode only (400 otherwise). |
| `GET /token/:token` | **Public**, no auth. `{ terminalId, mode, outlet }` — lets the display page pick a transport. |
| `GET /stream/:token` | **Public.** Server-Sent Events; each event is a JSON snapshot. |
