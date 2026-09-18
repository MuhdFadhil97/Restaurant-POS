# POS System

A single web-based Point of Sale application for retail/F&B, built with a multi-outlet-ready schema. See [`planning.md`](planning.md) for phase-by-phase progress and [`memory.md`](memory.md) for design decisions and rationale.

## Stack

- **Backend:** Node.js, Express, TypeScript, JWT auth, Zod validation
- **Frontend:** React (Vite), TypeScript, React Router, TanStack Query, Zustand, Tailwind CSS
- **Database:** PostgreSQL via Prisma ORM
- **Infra:** Docker Compose for local dev

## Scope (confirmed at kickoff)

- Multi-outlet from day one (outlet switcher, per-outlet stock, cross-outlet reporting)
- F&B with table management (tables, open tabs)
- Receipts: printable HTML only (thermal/ESC-POS deferred)

## Phase 7 additions

Built after the v1 core: Kitchen Display System / order routing (`KITCHEN` role, `/kds`), supplier & purchasing (purchase orders with partial receiving) + multi-outlet stock transfers, loyalty points + rule-based promotions + gift cards, and user access management (auth audit trail, account lockout). See [`planning.md`](planning.md) Phase 7 and [`memory.md`](memory.md) Key Decisions for details.

## Quick Start — Docker Compose

```bash
docker compose up --build
```

- Backend: http://localhost:4000 (health check at `/health`)
- Frontend: http://localhost:5173
- Postgres: localhost:5432 (user/pass/db: `pos`/`pos`/`pos`)

The backend container runs `prisma migrate deploy` on startup. Seed the demo data once the stack is up:

```bash
docker compose exec backend npm run seed
```

## Quick Start — Without Docker

Requires a local PostgreSQL instance.

```bash
# Backend
cd backend
cp .env.example .env        # edit DATABASE_URL to point at your Postgres
npm install
npx prisma migrate dev
npm run seed
npm run dev                 # http://localhost:4000

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

## Demo Accounts

Seeded by `npm run seed` (password for all: `password123`):

| Username  | Role    |
|-----------|---------|
| `admin`   | ADMIN   |
| `manager` | MANAGER |
| `cashier` | CASHIER |
| `kitchen` | KITCHEN |

A gift card code `WELCOME50` (balance $50) and a customer "Priya Regular" (with a starting loyalty balance) are also seeded, for trying gift-card/loyalty checkout.

## API Overview

All routes are prefixed with `/api`. Auth uses `Authorization: Bearer <token>`, obtained from `POST /api/auth/login`.

Error shape (consistent across the API):

```json
{ "error": { "message": "...", "code": "BAD_REQUEST", "details": {} } }
```

| Area | Routes |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` |
| Outlets | `GET/POST /outlets`, `GET/PATCH/DELETE /outlets/:id` |
| Users | `GET/POST /users`, `GET/PATCH/DELETE /users/:id` (admin only) |
| Categories | `GET/POST /categories`, `PATCH/DELETE /categories/:id` |
| Products | `GET/POST /products`, `GET/PATCH/DELETE /products/:id` (cost price hidden from cashiers) |
| Inventory | `POST /inventory/adjustments`, `GET /inventory/movements`, `GET /inventory/low-stock` |
| Tables | `GET/POST /tables`, `PATCH/DELETE /tables/:id` |
| Customers | `GET/POST /customers`, `GET /customers/:id`, `GET /customers/:id/history` |
| Discounts | `GET/POST /discounts`, `PATCH/DELETE /discounts/:id` |
| Tax Rates | `GET/POST /tax-rates`, `PATCH/DELETE /tax-rates/:id` |
| Transactions | `GET/POST /transactions`, `POST /transactions/checkout`, `POST /transactions/:id/finalize`, `POST/PATCH/DELETE /transactions/:id/items[/:itemId]`, `POST /transactions/:id/void`, `POST /transactions/:id/refund` |
| Cash Sessions | `POST /cash-sessions`, `POST /cash-sessions/:id/close`, `GET /cash-sessions/current`, `GET /cash-sessions` |
| Reports | `GET /reports/sales-summary`, `/top-products`, `/sales-by-cashier`, `/sales-by-payment-method` (admin/manager only) |
| Audit Logs | `GET /audit-logs` (admin only) |
| Kitchen Stations | `GET/POST /kitchen-stations`, `PATCH/DELETE /kitchen-stations/:id` |
| KDS | `GET /kds/queue`, `PATCH /kds/items/:itemId` (advance prep status) |
| Suppliers | `GET/POST /suppliers`, `GET/PATCH/DELETE /suppliers/:id` (admin/manager) |
| Purchase Orders | `GET/POST /purchase-orders`, `GET /purchase-orders/:id`, `POST /purchase-orders/:id/mark-ordered\|receive\|cancel` (admin/manager) |
| Stock Transfers | `GET/POST /stock-transfers`, `GET /stock-transfers/:id`, `POST /stock-transfers/:id/send\|receive\|cancel` (admin/manager) |
| Gift Cards | `GET /gift-cards/lookup?code=`, `GET/POST /gift-cards`, `PATCH /gift-cards/:id` |

### Checkout flow

- **Fast retail path:** `POST /transactions/checkout` — creates the transaction, decrements stock, and records payment in one atomic DB transaction.
- **Hold/park:** `POST /transactions` with no `tableId` creates a `HELD` draft with no payment; resume later via `POST /transactions/:id/finalize`.
- **F&B table tab:** `POST /transactions` with a `tableId` creates an `OPEN` draft; add items over time via `POST /transactions/:id/items`; finalize with `POST /transactions/:id/finalize`.
- **Void/refund:** cashiers must supply `approverId` + `approverPassword` of a manager/admin; managers/admins can self-approve.
- **Gift card payment:** a payment with `method: "GIFT_CARD"` must set `reference` to the card's code; the balance is checked and debited atomically alongside the rest of checkout.
- **Loyalty points:** a payment with `method: "LOYALTY_POINTS"` requires `customerId` on the transaction; the amount is converted to points via the outlet's redeem rate and debited from the customer. Points are also earned automatically on the paid total when a customer is attached (`Outlet.loyaltyEarnRate`).
- **Promotions:** any `Discount` applied (order- or line-level) is validated for eligibility (active, in date window, under its usage limit, meets minimum spend, correct product/category scope for line discounts) at checkout/finalize time and rejected with a 400 if ineligible; usage count increments only on a completed sale.

## Testing

```bash
cd backend && npm test
```

(Test suite is scaffolded via Vitest; add coverage as features stabilize.)
