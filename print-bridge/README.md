# POS Print Bridge

On-site agent that forwards print jobs from the POS backend to LAN thermal
printers, for when the backend is hosted remotely (not on a PC in the
restaurant). Run it on any always-on PC on the same network as the printers.

If the backend runs on-site instead, you don't need this — printers set to
"Network (LAN/Wi-Fi)" are reached directly.

## Setup

1. In the POS app: **Settings → Hardware → Print Bridges → Add Print Bridge**.
   The token is shown once — copy the `.env` snippet it gives you.
2. On the PC that will run the bridge:
   ```
   npm install
   cp .env.example .env   # then paste the snippet from step 1
   npm run dev            # or: npm run build && npm start
   ```
3. Back in the app, create a printer with connection **"Network via print
   bridge"** and pick this bridge.

If the token is ever lost or compromised, regenerate it from the same screen
— the old one stops working immediately.

## Running it unattended

Use a process manager (PM2, NSSM as a Windows service, etc.) so it survives
reboots, e.g.:

```
npm install -g pm2
pm2 start npm --name pos-print-bridge -- start
pm2 save
```
