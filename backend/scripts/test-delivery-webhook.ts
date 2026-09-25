// Simulates a delivery platform calling our webhook, for testing the
// Delivery Orders Kanban (Settings → Delivery to find/create a platform)
// without a real Grab/Foodpanda/DoorDash sandbox account. Signs the payload
// exactly the way a real platform (or our own CUSTOM adapter's documented
// contract, see src/lib/delivery/adapters/custom.ts) is expected to.
//
//   npx tsx scripts/test-delivery-webhook.ts --platform 1 --secret supersecretkey123 --sku SKU-042:2
//
// Flags:
//   --platform <id>       DeliveryPlatform id (required) — shown in Settings → Delivery
//   --secret <value>      That platform's webhook secret, plaintext (required — set when
//                          the platform was created; it's write-only afterwards, so if you
//                          don't have it, edit the platform in Settings and set a new one)
//   --sku <SKU:QTY>       Repeatable, required at least once, e.g. --sku SKU-042:2
//   --order-id <id>       Defaults to a random ORD-xxxxx
//   --customer <name>     Defaults to "Test Customer"
//   --phone <phone>       Defaults to "+60123456789"
//   --address <address>   Defaults to "1 Jalan Test, Kuala Lumpur"
//   --url <api base>      Defaults to http://localhost:4000/api
import crypto from "crypto";

function parseArgs(argv: string[]) {
  const flags: Record<string, string[]> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    (flags[key] ??= []).push(value);
  }
  return flags;
}

function randomOrderId() {
  return `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const platformId = flags.platform?.[0];
  const secret = flags.secret?.[0];
  const apiUrl = (flags.url?.[0] ?? "http://localhost:4000/api").replace(/\/+$/, "");

  if (!platformId || !secret) {
    console.error(
      "Usage: tsx scripts/test-delivery-webhook.ts --platform <id> --secret <webhookSecret> [--sku SKU-042:2] ..."
    );
    console.error("Find the platform id and (re)set its secret under Settings → Delivery.");
    process.exit(1);
  }

  const items = (flags.sku ?? []).map((entry) => {
    const [sku, qty] = entry.split(":");
    return { sku, name: sku, quantity: Number(qty ?? 1) };
  });
  if (items.length === 0) {
    console.error("At least one --sku SKU:QTY is required, e.g. --sku SKU-042:2 (must match an existing Product.sku).");
    process.exit(1);
  }

  const payload = {
    orderId: flags["order-id"]?.[0] ?? randomOrderId(),
    status: "NEW",
    customerName: flags.customer?.[0] ?? "Test Customer",
    customerPhone: flags.phone?.[0] ?? "+60123456789",
    deliveryAddress: flags.address?.[0] ?? "1 Jalan Test, Kuala Lumpur",
    items,
  };
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

  const res = await fetch(`${apiUrl}/delivery/webhooks/${platformId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Signature": signature },
    body,
  });

  console.log(`POST /delivery/webhooks/${platformId} -> ${res.status}`);
  console.log(await res.text());
  console.log(`\nSent order ${payload.orderId} — check the Delivery Orders Kanban (Incoming column).`);

  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
