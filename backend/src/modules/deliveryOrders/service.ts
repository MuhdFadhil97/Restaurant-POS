import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { decryptSecret } from "../../lib/crypto";
import { getOrCreateSystemUserId } from "../../lib/systemUser";
import { getDeliveryAdapter } from "../../lib/delivery/adapters";
import { ParsedDeliveryOrder } from "../../lib/delivery/types";
import * as transactionsService from "../transactions/service";
import { sendToKitchenSafely } from "../printJobs/kitchen";
import { ListOrdersQuery } from "./validation";

const detailInclude = {
  platform: { select: { id: true, provider: true, name: true } },
  transaction: {
    select: {
      id: true,
      receiptNumber: true,
      total: true,
      items: {
        select: {
          quantity: true,
          lineTotal: true,
          product: { select: { name: true } },
          variant: { select: { value: true } },
        },
      },
    },
  },
};

type OrderWithDetail = {
  rawPayload: unknown;
  platform: { provider: string };
  transaction: {
    items: { quantity: number; lineTotal: unknown; product: { name: string }; variant: { value: string } | null }[];
  } | null;
};

// What the customer actually ordered, for display. Once accepted, this is
// the authoritative TransactionItem list (real product names/pricing);
// before that, no Transaction exists yet, so each parsed SKU is resolved
// against our own Product.sku — same lookup acceptOrder's resolveItems
// does — rather than showing the platform's own item name/SKU string
// verbatim, so staff see the product they'll actually be preparing, not
// whatever label the platform sent. `mapped: false` flags a SKU with no
// matching product, so staff spot it before Accept fails on it.
async function displayItems(order: OrderWithDetail) {
  if (order.transaction) {
    return order.transaction.items.map((i) => ({
      name: i.variant ? `${i.product.name} (${i.variant.value})` : i.product.name,
      quantity: i.quantity,
      lineTotal: Number(i.lineTotal),
      mapped: true,
    }));
  }
  try {
    const adapter = getDeliveryAdapter(order.platform.provider as any);
    const parsedItems = adapter.parseIncomingOrder(order.rawPayload).items;
    const skus = [...new Set(parsedItems.map((i) => i.externalSku))];
    const products = await prisma.product.findMany({ where: { sku: { in: skus }, deletedAt: null } });
    const bySku = new Map(products.map((p) => [p.sku, p]));
    return parsedItems.map((i) => {
      const product = bySku.get(i.externalSku);
      return {
        name: product ? product.name : `${i.externalSku} (unmapped)`,
        quantity: i.quantity,
        lineTotal: null,
        mapped: !!product,
      };
    });
  } catch {
    return [];
  }
}

async function withDisplayItems<T extends OrderWithDetail>(order: T) {
  return { ...order, items: await displayItems(order) };
}

async function findPlatform(id: number) {
  const platform = await prisma.deliveryPlatform.findFirst({ where: { id, deletedAt: null } });
  if (!platform) throw ApiError.notFound("Delivery platform not found");
  if (!platform.isActive) throw ApiError.badRequest("Delivery platform is not active");
  return platform;
}

// Webhook entry point. Verifies the signature, parses the platform-specific
// payload via its adapter, then upserts on (platformId, externalOrderId) so
// a platform's at-least-once delivery retries land on the same row instead
// of creating duplicates — mirrors qrOrder's idempotency-by-natural-key
// approach, just keyed on the platform's id instead of a QR token.
export async function ingestWebhook(platformId: number, rawBody: Buffer, signatureHeader: string | undefined) {
  const platform = await findPlatform(platformId);
  const adapter = getDeliveryAdapter(platform.provider);

  if (!platform.webhookSecretEncrypted) {
    throw ApiError.badRequest("This platform has no webhook secret configured");
  }
  const webhookSecret = decryptSecret(platform.webhookSecretEncrypted);
  if (!adapter.verifySignature(rawBody.toString("utf8"), signatureHeader, webhookSecret)) {
    throw ApiError.unauthorized("Invalid webhook signature");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw ApiError.badRequest("Invalid JSON payload");
  }

  const parsed: ParsedDeliveryOrder = adapter.parseIncomingOrder(payload);

  const existing = await prisma.deliveryOrder.findUnique({
    where: { platformId_externalOrderId: { platformId, externalOrderId: parsed.externalOrderId } },
  });

  if (existing) {
    // A platform-side status echo on an order we've already actioned — just
    // record it, don't reopen a decision staff already made.
    const updated = await prisma.deliveryOrder.update({
      where: { id: existing.id },
      data: { externalStatus: parsed.externalStatus, rawPayload: payload as any, syncedAt: new Date() },
      include: detailInclude,
    });
    return withDisplayItems(updated);
  }

  const order = await prisma.deliveryOrder.create({
    data: {
      outletId: platform.outletId,
      platformId,
      externalOrderId: parsed.externalOrderId,
      externalStatus: parsed.externalStatus,
      rawPayload: payload as any,
      customerName: parsed.customerName,
      customerPhone: parsed.customerPhone,
      deliveryAddress: parsed.deliveryAddress,
      syncedAt: new Date(),
    },
    include: detailInclude,
  });

  if (platform.autoAccept) {
    return acceptOrder(order.id);
  }
  return withDisplayItems(order);
}

export async function listOrders(query: ListOrdersQuery) {
  const orders = await prisma.deliveryOrder.findMany({
    // Archived orders are hidden from the default Kanban view — see archiveOrder.
    where: { outletId: query.outletId, status: query.status, archivedAt: null },
    include: detailInclude,
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(orders.map(withDisplayItems));
}

export async function getOrder(id: number) {
  const order = await prisma.deliveryOrder.findUnique({ where: { id }, include: detailInclude });
  if (!order) throw ApiError.notFound("Delivery order not found");
  return withDisplayItems(order);
}

// Resolves each parsed item's platform SKU to a real Product via the
// existing Product.sku column (reused rather than adding a separate
// mapping table — see planning notes). Any unmapped SKU fails the whole
// accept with the full list, so staff fix the mapping once and retry —
// rawPayload is kept exactly as received, so nothing is lost.
async function resolveItems(rawPayload: unknown, provider: string) {
  const adapter = getDeliveryAdapter(provider as any);
  const parsed = adapter.parseIncomingOrder(rawPayload);
  const skus = [...new Set(parsed.items.map((i) => i.externalSku))];
  const products = await prisma.product.findMany({ where: { sku: { in: skus }, deletedAt: null } });
  const bySku = new Map(products.map((p) => [p.sku, p]));

  const missing = skus.filter((sku) => !bySku.has(sku));
  if (missing.length > 0) {
    throw ApiError.badRequest(`No product found for SKU(s): ${missing.join(", ")}. Map them under Products first.`);
  }

  return parsed.items.map((item) => ({
    productId: bySku.get(item.externalSku)!.id,
    quantity: item.quantity,
  }));
}

export async function acceptOrder(id: number) {
  const order = await prisma.deliveryOrder.findUnique({ where: { id }, include: { platform: true } });
  if (!order) throw ApiError.notFound("Delivery order not found");
  if (order.status !== "PENDING") {
    throw ApiError.badRequest(`Cannot accept an order with status ${order.status}`);
  }

  const items = await resolveItems(order.rawPayload, order.platform.provider);
  const systemCashierId = await getOrCreateSystemUserId();
  const transaction = await transactionsService.createDeliveryTransaction(
    order.outletId,
    systemCashierId,
    items,
    order.externalOrderId
  );
  await sendToKitchenSafely(transaction.id, null);

  const updated = await prisma.deliveryOrder.update({
    where: { id },
    data: { status: "ACCEPTED", acceptedAt: new Date(), transactionId: transaction.id },
    include: detailInclude,
  });

  if (order.platform.apiKeyEncrypted && getDeliveryAdapter(order.platform.provider).pushStatusUpdate) {
    await getDeliveryAdapter(order.platform.provider).pushStatusUpdate!(
      decryptSecret(order.platform.apiKeyEncrypted),
      order.externalOrderId,
      "ACCEPTED"
    );
  }

  return withDisplayItems(updated);
}

export async function rejectOrder(id: number, reason: string) {
  const order = await prisma.deliveryOrder.findUnique({ where: { id } });
  if (!order) throw ApiError.notFound("Delivery order not found");
  if (order.status !== "PENDING") {
    throw ApiError.badRequest(`Cannot reject an order with status ${order.status}`);
  }
  const updated = await prisma.deliveryOrder.update({
    where: { id },
    data: { status: "REJECTED", rejectedReason: reason },
    include: detailInclude,
  });
  return withDisplayItems(updated);
}

// READY and PICKED_UP are the only forward transitions once accepted — a
// platform-settled order that's already ACCEPTED (paid, stock decremented)
// isn't cancellable from the Kanban; that has to go through a manager void
// on the resulting transaction, same as any other completed sale.
const nextStatus: Record<string, string> = { READY: "ACCEPTED", PICKED_UP: "READY" };

export async function updateOrderStatus(id: number, status: "READY" | "PICKED_UP") {
  const order = await prisma.deliveryOrder.findUnique({ where: { id } });
  if (!order) throw ApiError.notFound("Delivery order not found");
  if (order.status !== nextStatus[status]) {
    throw ApiError.badRequest(`Cannot move an order from ${order.status} to ${status}`);
  }
  const updated = await prisma.deliveryOrder.update({
    where: { id },
    data: {
      status,
      readyAt: status === "READY" ? new Date() : undefined,
      pickedUpAt: status === "PICKED_UP" ? new Date() : undefined,
    },
    include: detailInclude,
  });
  return withDisplayItems(updated);
}

// Only from a terminal state — an in-flight order (PENDING/ACCEPTED/READY)
// staff still needs to act on can't be hidden by mistake. Sets archivedAt
// rather than deleting: the row (and the receipt/e-invoice on its
// Transaction, if any) is a financial record, same "never hard-delete"
// convention as Transaction/Reservation elsewhere in this schema.
const archivableStatuses = new Set(["PICKED_UP", "REJECTED"]);

export async function archiveOrder(id: number) {
  const order = await prisma.deliveryOrder.findUnique({ where: { id } });
  if (!order) throw ApiError.notFound("Delivery order not found");
  if (order.archivedAt) throw ApiError.badRequest("Order is already archived");
  if (!archivableStatuses.has(order.status)) {
    throw ApiError.badRequest(`Cannot archive an order with status ${order.status}`);
  }
  const updated = await prisma.deliveryOrder.update({
    where: { id },
    data: { archivedAt: new Date() },
    include: detailInclude,
  });
  return withDisplayItems(updated);
}
