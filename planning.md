# POS Project — Planning & Progress

Status markers: ⬜ Not started · 🟨 In progress · ✅ Done · ⛔ Blocked

## Phase 0 — Setup
- ✅ Confirm scope (multi-outlet from day one, F&B with table management, loyalty deferred, HTML receipts only)
- ✅ Folder structure (backend + frontend)
- ✅ Prisma schema
- ✅ Docker Compose (Postgres + backend + frontend)
- ✅ Repo init (git)

## Phase 1 — Backend Foundation
- ✅ Prisma schema migrated (verified against local Postgres)
- ✅ Auth (JWT login, `/auth/me`)
- ✅ Role guards (admin/manager/cashier) on routes
- ✅ Seed script (demo outlets, users, products, categories, tables, discounts)

## Phase 2 — Product & Inventory
- ✅ Product CRUD (+ categories)
- ✅ Variant model (nested create/update on product)
- ✅ Per-outlet stock (ProductStock)
- ✅ Stock adjustment endpoint (restock/wastage/correction) + audit log
- ✅ Low-stock alert threshold logic + UI banner

## Phase 3 — Checkout / Sales
- ✅ Cart/checkout API (DB-transaction-safe: stock + sale atomic)
- ✅ Discounts (line + order level) and tax calculation
- ✅ Split payments (multiple Payment rows per transaction)
- ✅ Hold/resume transaction (status HELD)
- ✅ F&B table sessions (Transaction.tableId, status OPEN)
- ✅ Void/refund with manager approval flow
- ✅ Receipt generation (printable HTML, print-only CSS)

## Phase 4 — Frontend
- ✅ Login screen
- ✅ POS checkout screen (product grid/search, cart, table strip, held transactions, split payment modal, shift open/close)
- ✅ Transaction history + detail view (with void/refund actions)
- ✅ Admin: product/category management + stock adjustment UI
- ✅ Admin: user management
- ✅ Outlet switcher (multi-outlet UI)
- ✅ Customer management + purchase history

## Phase 5 — Reporting
- ✅ Sales summary (daily/weekly/monthly, via raw SQL date_trunc)
- ✅ Top-selling products
- ✅ Sales by cashier / by payment method
- ✅ Cash session reconciliation (expected vs actual cash) — UI + open/close shift flow

## Phase 6 — Polish & Hardening
- ✅ Validation coverage (Zod on all endpoints)
- ✅ Audit logging (voids, refunds, stock adjustments)
- 🟨 Responsive/tablet testing (desktop layout verified in-browser via Playwright; real tablet/touch testing not yet done)
- ✅ Settings UI (outlet + receipt template, tax rate config, table management)
- ✅ Final README

## Verified End-to-End (2026-09-16)
Ran against a real local Postgres instance (not just type-checked):
- Login for admin/manager/cashier, JWT issued and enforced
- Cashier product list correctly strips `costPrice`
- Full checkout: cart → payment → atomic stock decrement → inventory movement recorded
- POS screen in-browser: product grid, add-to-cart pricing preview (tax-exclusive math matches backend), payment modal, held transactions
- Transactions history list + detail
- Admin Products page (low-stock banner, cost price visible), Reports page (all four report types + cash reconciliation empty state), Settings page (outlets, users, tax rates, tables tabs)
- Fixed a real bug found during this pass: `PaymentModal` seeded its default payment amount only on first mount (when cart was empty), so `Pay` stayed disabled after adding items — fixed with a `useEffect` that re-seeds the amount whenever the modal opens, plus consistent `round2()` rounding to avoid float-precision mismatches between preview and backend totals.

## Phase 7 — Business Module Expansion (2026-09-16)
Requested by user after reviewing a module-recommendation menu (see `.claude/plans` session); all four priority picks implemented in one pass:
- ✅ **User Access Management** — auth audit trail (LOGIN_SUCCESS/LOGIN_FAILURE/ACCOUNT_LOCKED/USER_ROLE_CHANGED/USER_PASSWORD_CHANGED/USER_OUTLET_ACCESS_CHANGED events), account lockout after 5 failed attempts (15 min), admin-facing Audit Log viewer. Configurable permissions, session revocation, and email-based password reset/invitations were **not** built (need an email integration and/or a bigger RBAC rework — see memory.md Known Issues).
- ✅ **Kitchen Display System / Order Routing** — `KitchenStation` model, `Product.stationId`, `TransactionItem.prepStatus` (QUEUED→PREPARING→READY→SERVED), new `KITCHEN` role, `/kds` page with per-station filtering and live polling, role-aware login/home routing (`getHomeRoute`).
- ✅ **Supplier & Purchasing + Multi-Outlet Stock Transfer** — `Supplier`, `PurchaseOrder`/`PurchaseOrderItem` (draft→ordered→partially/fully received, atomic stock increment on receipt), `StockTransfer`/`StockTransferItem` (pending→in-transit→received, atomic decrement-then-increment across two outlets). Settings tabs for both.
- ✅ **Loyalty, Promotions & Gift Cards** — `Customer.pointsBalance` with accrual/redemption via `Outlet.loyaltyEarnRate`/`loyaltyRedeemRate`, `Discount` extended with promotion rules (minSpend/date window/usageLimit/product-or-category scope) validated and usage-counted at checkout, `GiftCard` model with `GIFT_CARD` payment method (balance debited atomically) and `LOYALTY_POINTS` payment method.

**Verified end-to-end in-browser** (Playwright, admin/cashier/kitchen logins): KDS live queue updates and status transitions, gift-card checkout (balance correctly debited across two separate test transactions, $50 → $45 → $36.63), loyalty points accrued on a real customer, purchase order draft→ordered→partially-received with stock increment confirmed, stock transfer send→receive across two outlets with stock moving correctly, all 7 new Settings tabs render with zero console errors.

## Phase 8 — Hardware Configuration Module (started 2026-09-24, branch `hardware-module`)
Plan: `~/.claude/plans/please-plan-a-module-zesty-castle.md`. Scope: receipt printers, kitchen/bar printers, cash drawer, customer display; all connection paths (direct LAN, on-site print bridge, terminal-attached USB/Bluetooth); terminals registered as named devices.
- ✅ **8.1 Foundation** — `Terminal`/`Printer`/`PrintBridge`/`PrintJob` models (+ `KitchenStation.printerId`, `CashSession.terminalId`, `TransactionItem.kitchenPrintedAt`); ESC/POS rendering in `backend/src/lib/printing/`; DB-backed print-job queue with atomic claim, 3-attempt retry, stale-claim requeue; in-process dispatcher for `NETWORK_DIRECT` printers; `terminals`/`printers`/`printJobs` modules; Settings → Hardware tab (This Device / Terminals / Printers / Print Jobs); POS "set up this device" banner + terminal heartbeat. Verified with `backend/scripts/fake-printer.ts` + Playwright.
- ✅ **8.2 Receipts + cash drawer** — checkout/finalize take an optional `terminalId` and queue an ESC/POS receipt on that terminal's printer after commit (drawer kick embedded when a CASH payment + `cashDrawerEnabled`); `POST /print-jobs/receipt` reprint (marked `** REPRINT **`); `POST /terminals/:id/drawer` "No sale" with `DRAWER_OPENED` audit; cash sessions record `terminalId`; receipt modals show print status + Retry and fall back to `window.print()` without a printer; shift bar shows terminal/printer health + Open Drawer. Verified with fake printer + Playwright (cash/card/reprint/no-sale/printer-offline-then-retry).
- ✅ **8.3 Kitchen tickets** — `KitchenStation.printerId` (Kitchen Stations tab now has full CRUD + printer); one ticket per station with no prices (NEW / ADDITIONAL ORDER / CANCELLED); fires on "Send to Table" (`sendToKitchen: true` on draft create), explicit "Send to Kitchen (n)" for open/held orders, walk-in checkout, finalize (leftovers), and QR self-orders. Items claimed via `kitchenPrintedAt` stamp so nothing prints twice; raising qty on a sent line splits the extra into a new unsent line; removing/reducing a sent line prints a CANCELLED ticket. Cart shows "Not sent" tags. Verified end-to-end with two fake printers (Kitchen 80mm / Bar 58mm).
- ✅ **8.4 Customer display** — `Terminal.customerDisplayMode` (`SAME_DEVICE`/`REMOTE`) drives which transport is used: `SAME_DEVICE` publishes over `BroadcastChannel` (no backend involved, instant); `REMOTE` PUTs a debounced snapshot to `backend/src/modules/customerDisplay/` (in-memory, keyed by terminal — not a DB table, it's ephemeral cart state), relayed to the tablet over SSE. Public `/display/:token` page (`frontend/src/features/customerDisplay/CustomerDisplayPage.tsx`) looks up its mode via a public `GET /customer-display/token/:token` first, then picks the matching transport. Terminals settings shows the display link with copy/regenerate. Verified end-to-end across separate Playwright browser contexts (simulating a genuinely separate tablet) for both modes: cart items appear live, a paid sale shows a Thank You screen, New Sale returns to Welcome.
- ✅ **8.5 Print bridge agent** — `PrintBridge` staff CRUD (`ADMIN` only, token shown once with a ready-to-paste `.env` snippet, regenerate on demand); token-authenticated agent endpoints (`GET /print-bridge/jobs` claim, `POST /print-bridge/jobs/:id/ack`) reuse the same queue (`claimPending`/`ack`) the direct-printer dispatcher uses, so retry/stale-claim behavior is identical; the ack endpoint verifies the job's printer actually belongs to the calling bridge before touching it. Standalone `print-bridge/` package (Node/tsx, no shared deps with the backend) polls, forwards over raw TCP, acks, and piggy-backs its heartbeat on every poll. Printer form's "Network via print bridge" option is enabled with a bridge picker. Verified against the real agent process end-to-end: printed, failed-then-retried while the target printer was down, and a UI-driven create → rename → use-in-a-printer flow.
- ⬜ 8.6 Terminal-local USB/Bluetooth (WebSerial/WebUSB; Capacitor plugin in the Android clone)

## Open Decisions / Questions
- ✅ Single vs multi-outlet launch → **multi-outlet from day one** (outlet switcher, per-outlet stock, cross-outlet reporting)
- ✅ Retail vs F&B → **F&B with table management** (Table model, Transaction.tableId, open-tab flow)
- ✅ Loyalty points → **deferred to future phase**; Customer profile + purchase history ship in v1
- ✅ Receipt/printer → **HTML receipt only** for v1; thermal/ESC-POS deferred — *superseded 2026-09-24 by Phase 8 (hardware module); HTML/`window.print()` stays as the fallback for devices without a receipt printer*
- ✅ Roles model → **enum** (`admin/manager/cashier`), not a `roles` table, since roles are fixed and not tenant-configurable
- ✅ Tax calculation method → **tax-exclusive pricing**; order-level discount applied after tax (see memory.md Key Decisions)
- ✅ Refund approval flow → cashier must supply a manager/admin's `approverId` + `approverPassword`; managers/admins self-approve. Refunds are full-only in v1 (no partial refund).
- ⬜ Approver selection UX — currently a raw user-ID text field on the cashier's void/refund modal; consider a username-based lookup or a manager PIN pad in a later phase.

## Change Log
| Date | Change |
|------|--------|
| 2026-09-16 | Project kicked off. Scope decisions confirmed (multi-outlet, F&B, no loyalty v1, HTML receipts). Folder structure and Prisma schema proposed and approved. |
| 2026-09-16 | Backend fully implemented (all modules through Phase 5) and type-checked. Frontend fully implemented (all modules through Phase 5) and type-checked. |
| 2026-09-16 | End-to-end verification against real Postgres + browser: found and fixed a payment-modal stale-default-amount bug, a missing table-status cache invalidation, and a cart-clearing bug on table selection. All core flows (auth, checkout, F&B tables, hold/resume, inventory, reports, settings) confirmed working. |
| 2026-09-16 | All id/FK columns converted from `text` to native Postgres `uuid` (`@db.Uuid` added throughout schema.prisma) per user request. Required dropping and recreating the dev database and squashing migration history into one clean `init` migration, since only seed data existed. Reseeded and re-verified checkout end-to-end. |
| 2026-09-16 | Presented a 4-area + broader-list module recommendation menu (business-functionality focus per user's stated priority); user approved all 4 priority picks (purchasing/transfer, KDS, loyalty/promotions/gift cards, user access management) for immediate build. |
| 2026-09-16 | Phase 7 built and verified end-to-end: 7 new backend modules, 1 new frontend feature (KDS) + 7 new Settings tabs, `KITCHEN` role added, checkout flow extended with promotion validation/gift-card debit/loyalty accrual. New migration (`business_modules`) applied additively (no data loss this time). |
| 2026-09-16 | Added a "Categories" Settings tab (list/rename/delete, backend already supported full CRUD) — user asked for supplier + category setup under Settings; Suppliers was already there from Phase 7, so this closed the Category gap. Frontend-only change, verified in-browser: rename propagates live to the Product form's category dropdown via shared query cache. |
| 2026-09-16 | Suppliers tab gained Edit and Delete (previously create+list only) — new `useUpdateSupplier`/`useDeleteSupplier` hooks, edit reuses a `SupplierFormModal` shared with create (same pattern as `OutletsTab.tsx`), delete confirms via a native `window.confirm` then soft-deletes (backend already supported it). Frontend-only change, verified in-browser: create → edit (rename) → delete all confirmed working with zero console errors. |
| 2026-09-16 | Tables tab gained Edit and Delete (previously create+list only) — new `useUpdateTable`/`useDeleteTable` hooks, edit reuses a `TableFormModal` shared with create (name/capacity, status field shown edit-only since new tables always start AVAILABLE); kept the existing pill/badge list style, just added action links per pill. Frontend-only change, verified in-browser: created a scratch table, renamed + resized + set to RESERVED (badge color updated correctly), deleted it — seeded T1/T2/T3 unaffected, zero console errors. |
| 2026-09-16 | **Bug fix:** every Settings edit modal (Outlets, Users, Suppliers, Tables) showed blank/stale fields instead of the selected row's actual values — the exact same stale-`useState`-initializer bug as the `PaymentModal` fix from earlier in this build, just not applied when these modals were written. Fixed all four with a `useEffect` keyed on `[open, initial]` that re-seeds every field when the modal opens. Verified in-browser for all four, including the critical case: opening Edit on table T1 then, without a full page reload, opening Edit on T2 correctly shows T2's data, not T1's leftover values. |
| 2026-09-16 | Discounts & Promotions and Gift Cards tabs gained Edit and Delete (previously create+list only) — built the edit modals with the `useEffect` re-seed fix applied from the start this time (proactively, per the pattern just fixed). Discount delete is a real `DELETE` call (backend soft-deletes via `isActive: false`, same as every other tab). Gift cards have no backend `DELETE` route by design (a card can carry real balance and is referenced by past `Payment` rows) — "Delete" reuses the existing `PATCH` to deactivate (`isActive: false`); the Delete link is hidden once a card is already inactive, and its `code` field is disabled (read-only) when editing since a card's code shouldn't change after issuance. Verified in-browser: created, edited (confirmed correct prefill), and removed a scratch discount and a scratch gift card end-to-end with zero console errors; scratch gift card cleaned up via direct SQL afterward since there's no hard-delete path (by design). |
| 2026-09-16 | Sidebar made collapsible/expandable — new `frontend/src/store/uiStore.ts` (Zustand, persisted, matching `outletStore`'s pattern) holds `sidebarCollapsed`; a chevron toggle button next to the "POS" logo flips it. Added a small hand-rolled SVG icon set (`frontend/src/components/icons.tsx`, no new dependency) so nav items read as icons when collapsed (`w-16`) and icon+label when expanded (`w-56`), with `title` tooltips on collapsed items and the logout control swapping from a text link to an icon button. Verified in-browser: collapse/expand toggles the width correctly, navigation still works while collapsed, the collapsed state survives a full page reload (localStorage), zero console errors. |
| 2026-09-16 | Currency symbol changed from `$` to `RM` (Malaysian Ringgit) app-wide — centralized in the `money()` helper (`frontend/src/features/pos/cartMath.ts`) which now returns `"RM 12.34"` directly, then stripped the redundant hardcoded `$` from all ~40 call sites across 15 files (POS cart, payment modal, receipts, transactions, reports, all Settings tabs). Seed data discount name `"$1 Off"` renamed to `"RM1 Off"` (in both `seed.ts` and the live dev database). **Incidental bug found and fixed while verifying:** the Reports page's two raw-SQL queries (`salesSummary`, `topProducts` in `backend/src/modules/reports/service.ts`) were silently 500ing — a leftover regression from the earlier `text`→`uuid` column migration, since `$queryRaw` sends the interpolated `outletId` as a `text` parameter and Postgres won't implicitly compare it against the now-`uuid` `outlet_id` column. Fixed by adding an explicit `::uuid` cast at both interpolation points. Verified in-browser end-to-end: zero literal `$` remaining anywhere, `RM` displays correctly on POS/payment modal/reports/receipts/settings, and the Reports page (previously silently broken) now loads with zero console errors. |
| 2026-09-24 | Phase 8 (hardware module) planned; 8.1 foundation built and verified (fake TCP printer + Playwright). New migration `add_hardware_module` applied additively. |
| 2026-09-24 | Phase 8.1 committed (fe94105). 8.2 (receipts + cash drawer) built and verified. Found and fixed a pre-existing crash: POS cart used `crypto.randomUUID()`, which is undefined on plain-http LAN origins, so adding an item crashed the POS on any non-localhost device. |
| 2026-09-24 | 8.2 committed (db0f775). 8.3 (kitchen tickets) built and verified end-to-end (table send, follow-up, qty split, cancellation, walk-in, QR). |
| 2026-09-24 | 8.3 committed (c2bfae1). 8.4 (customer display) built and verified across separate browser contexts for both SAME_DEVICE (BroadcastChannel) and REMOTE (SSE) modes. |
| 2026-09-24 | 8.4 committed (6a89d7a). 8.5 (print bridge) built; found and fixed a pre-existing crash bug (see memory.md) while testing it. Verified against the real print-bridge agent process. |
