# New Outlet Setup Guide

Walkthrough for bringing up a brand-new outlet in the POS — written using
**Kafe 97** as the running example. Follow it top to bottom the first time;
after that it doubles as a reference for any one step. If you're setting up
receipt/kitchen printers, the cash drawer, or a customer display, that's a
separate, more detailed guide: [`HARDWARE_SETUP.md`](HARDWARE_SETUP.md) —
step 6 below just points you there at the right moment.

## Before you start

- You'll need an **ADMIN** login. Everything here lives under **Settings**
  (left sidebar, visible to admins only).
- The product catalog (Products, Categories) is **shared across all
  outlets** — you don't recreate the menu for Kafe 97, you just stock it
  (step 7). Everything else on this page — tables, tax rates, kitchen
  stations, terminals, printers — is per-outlet and starts empty for a new
  one.
- Check your license has room for another outlet first: **Settings** shows
  a renewal/limit banner if not, and outlet creation will otherwise fail
  with a "license" error. See [`backend/docs/LICENSING.md`](backend/docs/LICENSING.md)
  if you need to raise the `maxOutlets` limit on this deployment's license
  key. In local dev with no `LICENSE_KEY` set, there's no limit to worry
  about.

## 1. Create the outlet

**Settings → Outlets & Receipt → + New Outlet.** Fill in:

| Field | Notes |
|---|---|
| Outlet Name | e.g. `Kafe 97` |
| Address / Phone | Shown on receipts |
| Receipt Logo URL / Footer Text | Optional — leave blank for the plain default receipt |
| Service Charge | On by default at 10%; untick if Kafe 97 doesn't charge one, or adjust the rate |
| e-Invoice (TIN / BRN / MSIC / SST) | Only fill in if Kafe 97 is registered for LHDN MyInvois e-Invoicing — leave all blank to skip e-Invoices entirely for this outlet |

Save. Kafe 97 now appears in the outlet switcher (top-right of the app) —
switch to it before doing the rest of this guide, since most of the
remaining screens act on whichever outlet is currently selected there.

## 2. Give staff access to it

**Settings → Users.** For each person who'll work at Kafe 97:

- **New user** — set their role (Admin/Manager/Cashier/Kitchen) and tick
  **Kafe 97** under Outlet Access.
- **Existing user** who should also work here (e.g. a manager covering
  multiple outlets) — edit them and tick Kafe 97 too; outlet access is
  many-to-many, so this doesn't remove their access elsewhere.

Admins see every outlet automatically and don't need explicit access rows.
Anyone without access to Kafe 97 won't see it in their outlet switcher.

## 3. Set up tax rates

**Settings → Tax Rates** (with Kafe 97 selected in the outlet switcher —
this tab is empty until you pick an outlet). Add each rate Kafe 97 charges
(e.g. `SST 6%`) and mark one **Set as default** so new products/orders pick
it up automatically. Tax rates don't carry over from other outlets — this
list starts empty for every new outlet.

## 4. Add tables and arrange the floor plan

Skip this if Kafe 97 is counter-service only.

1. **Settings → Tables → + New Table** — add each table with a name and
   seat count.
2. **Settings → Floor Plan** — drag tables into their real layout. This is
   what staff see when opening a table from the POS screen, and each
   table's QR code (for self-order, if used) is generated from the Tables
   tab.

## 5. Route kitchen orders

**Settings → Kitchen Stations → + New Station** — create one per prep area
(e.g. "Kitchen", "Bar"). You'll assign a printer to each station in the
hardware step next. Once stations exist, go through **Products** and set
each menu item's **Kitchen Station** so orders route correctly — this is a
per-product setting, but since the catalog is shared, you only need to do
it once per product, not per outlet (a product just won't print anywhere
useful at Kafe 97 until you either reuse the same station name pattern or
confirm its assigned station's printer belongs to Kafe 97).

## 6. Hardware — printers, cash drawer, terminals, customer display

This is the involved part, so it has its own guide:
[`HARDWARE_SETUP.md`](HARDWARE_SETUP.md). Do it now, with Kafe 97 selected
as the active outlet — every terminal and printer you create there
attaches to whichever outlet is active at the time. Short version:

1. Register each till/tablet as a **Terminal**.
2. Add each **Printer** (network, print bridge, or USB/Bluetooth) and test
   print it.
3. Assign each terminal its receipt printer, and tick cash drawer if wired
   through it.
4. Assign each Kitchen Station (step 5) a printer.
5. Optionally set up a customer-facing display per terminal.

## 7. Stock the menu for this outlet

Products and categories are shared across outlets, but **stock is
per-outlet** and starts at zero everywhere for a brand-new outlet — nothing
carries over from your other locations. Go to **Inventory → Stock
Adjustment** (with Kafe 97 selected), and add an opening quantity for each
stocked item. Items you don't stock-track (e.g. made-to-order dishes with
no raw-material tracking) can be skipped — they'll still sell fine with no
stock row.

If Kafe 97 shares suppliers with another outlet, you can also bring stock
in via a **Purchase Order → Goods Received Note** instead of a manual
adjustment, if you want the paper trail from day one.

## 8. Optional: discounts, loyalty, gift cards

- **Discounts & Promotions** and **Gift Cards** (Settings) are global, not
  per-outlet — nothing to set up here unless Kafe 97 needs a new one.
- **Loyalty** earn/redeem rates are per-outlet fields on the outlet record
  itself (defaults: earn 1 point per currency unit spent, redeem at 0.01
  per point) — only worth changing via the API/DB directly if Kafe 97's
  rates should differ from the default; there's no dedicated UI field for
  it yet on the Outlets tab.

## 9. Go live checklist

- [ ] Outlet created, visible in the outlet switcher
- [ ] Relevant staff have Kafe 97 ticked under Outlet Access
- [ ] At least one default tax rate set
- [ ] Tables added and arranged (skip if counter-service only)
- [ ] Kitchen stations created and menu items assigned to one
- [ ] Every till registered as a Terminal, with a working receipt printer
      (test print succeeded) and cash drawer configured if applicable
- [ ] Kitchen/bar printers assigned to their stations, test printed
- [ ] Opening stock entered for tracked items
- [ ] Do one real test sale end-to-end: ring it up on the POS, pay by
      cash, confirm the receipt prints, the drawer opens, and (if
      applicable) a kitchen ticket fires

## Troubleshooting

| Symptom | Check |
|---|---|
| Creating the outlet fails with a license error | This deployment's license `maxOutlets` limit is reached — see [`backend/docs/LICENSING.md`](backend/docs/LICENSING.md) |
| Kafe 97 doesn't show up for a staff member | Confirm they have an Outlet Access row for it (step 2); admins always see every outlet |
| Tax Rates / Tables / Kitchen Stations tab looks empty or says "Select an outlet first" | Switch to Kafe 97 in the outlet switcher (top-right) — these tabs are scoped to the active outlet |
| A shared product doesn't sell / shows no stock at Kafe 97 | Stock is per-outlet — add an opening quantity via Inventory → Stock Adjustment (step 7) |
| Printer/drawer/kitchen ticket issues | See the Troubleshooting table in [`HARDWARE_SETUP.md`](HARDWARE_SETUP.md) |
