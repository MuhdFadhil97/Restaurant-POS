# Hardware Setup Guide

For whoever configures the POS at a restaurant: receipt printers, kitchen/bar
ticket printers, the cash drawer, and a customer-facing display. If you're
looking for how this is built rather than how to set it up, see
[`backend/docs/HARDWARE.md`](backend/docs/HARDWARE.md) instead.

## Before you start

- You'll need an **ADMIN** or **MANAGER** login. Cashiers can use hardware
  day-to-day (retry a failed print, open the drawer) but can't configure it.
- Everything here lives under **Settings → Hardware**, plus **Settings →
  Kitchen Stations** for routing menu items to a kitchen/bar printer.
- One core idea worth understanding up front: a **Terminal** is a named
  device — "Counter 1", "Counter 2" — not a person. Whoever is logged in on
  that till doesn't matter; the till itself remembers which terminal it is.

## 1. Register this device as a terminal

The first time a new till or tablet opens the POS screen, it shows a banner:
*"This device isn't set up as a terminal."* Click **Set up**, then either
pick an existing terminal (if this machine is replacing one) or create a new
one, e.g. "Counter 1". You can also do this later from **Settings → Hardware
→ This Device**.

Skipping this is fine — receipts just print through the browser's normal
print dialog instead, with no cash drawer.

## 2. Add a receipt printer

**Settings → Hardware → Printers → New Printer.** Pick a connection type:

| Connection | When to use it | What it needs |
|---|---|---|
| **Network (LAN/Wi-Fi)** | The printer is on the same network as the backend server itself. | The printer's IP address and port (almost always `9100`). |
| **Network via print bridge** | The backend is hosted elsewhere (cloud), not on a PC in the restaurant. | A print bridge set up first — see [step 6](#6-backend-hosted-elsewhere-set-up-a-print-bridge). |
| **USB / Bluetooth on a terminal** | The printer is plugged into one specific till, not reachable over the network. | A terminal to plug it into, then pairing it in that till's own browser — see [step 7](#7-connect-a-usb-or-serial-printer). |

Set the paper width (58mm or 80mm) — it also sets a sensible default column
count, which you can adjust if the receipt looks too narrow or wraps oddly.

Click **Test print** on the new printer. It should show **Printed** within a
couple of seconds; if it says **Failed**, hover the error text for why (wrong
IP, printer off, wrong port are the usual culprits).

Finally, go to **Settings → Hardware → Terminals**, edit the terminal this
printer belongs to, and set it as that terminal's **Receipt printer**. Sales
made on that terminal print there automatically from now on.

## 3. Turn on the cash drawer

The drawer is triggered through the receipt printer's kick port, so it needs
a receipt printer assigned first (step 2). In **Terminals → Edit**, tick
**"Cash drawer is connected to this receipt printer."**

- It opens automatically whenever a **cash** payment is taken on that
  terminal.
- For any other reason ("no sale", giving change), use **Open Drawer** on the
  shift bar at the top of the POS screen — it asks for a reason and logs it
  to the audit log.

## 4. Route kitchen/bar orders to a printer

1. **Settings → Kitchen Stations** — create a station (e.g. "Kitchen",
   "Bar") if it doesn't exist yet, and assign it a printer the same way as
   step 2 (any connection type works here too).
2. **Products → edit a product → Kitchen Station** — assign each menu item
   to the station that makes it. A product with no station only shows on the
   Kitchen Display, never prints a ticket.

Once that's done, tickets print automatically: when an order is sent to a
table, when a walk-in sale is paid, when a QR self-order comes in, and via
the **Send to Kitchen** button on an open tab for anything added since the
last send. A follow-up order to an already-fired table prints as an
"ADDITIONAL ORDER"; removing an item that already printed sends a
"CANCELLED" ticket for it.

## 5. Set up a customer-facing display

In **Terminals → Edit**, set **Customer display** to one of:

- **Second monitor on this device** — for a screen plugged into the same
  till (e.g. a second HDMI output). Open the display link on that monitor
  once; it updates instantly and needs nothing further.
- **Separate tablet or screen** — for a screen elsewhere on the network.
  Copy the link shown and open it on that tablet's browser.

Either way, the display shows the live cart and total, then a "Thank you!"
screen right after payment.

## 6. Backend hosted elsewhere: set up a print bridge

Skip this if the backend runs on a PC in the restaurant — use "Network
(LAN/Wi-Fi)" printers directly instead (step 2).

1. **Settings → Hardware → Print Bridges → Add Print Bridge.** You'll get a
   token **shown once**, with a ready-to-paste `.env` snippet — copy it
   immediately.
2. On any always-on PC on the same network as the printers:
   ```
   cd print-bridge
   npm install
   # paste the snippet from step 1 into .env
   npm run build && npm start
   ```
   See [`print-bridge/README.md`](print-bridge/README.md) for running it as a
   background service (PM2, etc.) so it survives reboots.
3. Back in the app, add printers with connection **"Network via print
   bridge"**, picking this bridge.

If the token is ever lost or you suspect it leaked, **Regenerate token** on
the same screen — the old one stops working immediately.

## 7. Connect a USB or serial printer

> **This only works if the till's browser opens the app over `https://`, or
> as `http://localhost`.** Chrome and Edge refuse USB/serial access on a
> plain address like `http://192.168.1.20:5173` — no error, the "Connect"
> buttons below just won't appear. If your restaurant's POS is reached that
> way, use "Network (LAN/Wi-Fi)" or a print bridge instead.

1. Add the printer with connection **"USB / Bluetooth on a terminal"**,
   picking which terminal it's plugged into (step 2).
2. On **that terminal's own machine**, open **Settings → Hardware → This
   Device**. The printer appears under "Printers plugged into this device."
3. Click **Connect via USB** or **Connect via serial/COM port** and pick the
   printer in the browser's device picker.

That's a one-time step per browser — it reconnects automatically after that,
as long as the printer stays plugged in and the browser isn't reset.

## Troubleshooting

| Symptom | Check |
|---|---|
| A print job says **Failed** | Hover the error message (or check **Print Jobs**). Usually: printer off, wrong IP/port, or (for a bridge printer) the bridge itself is offline. Fix it, then hit **Retry**. |
| Nothing prints at checkout | Does the terminal have a receipt printer assigned (step 2)? Is this device even set up as a terminal (step 1)? |
| Drawer doesn't open on a cash sale | Is "cash drawer is connected" ticked, and is a receipt printer assigned? It only fires on `CASH` payments. |
| "Connect via USB/serial" buttons are missing | Check the address bar — needs `https://` or `http://localhost` (see step 7). |
| A print bridge shows offline | Is the `print-bridge` process actually running on that PC? Check its console output — it logs every job and every failure. |
| Kitchen ticket never printed for an item | Is that product assigned to a Kitchen Station (step 4), and does that station have a printer? Unassigned items only ever show on the Kitchen Display. |
