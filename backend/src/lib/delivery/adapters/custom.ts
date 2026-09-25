import crypto from "node:crypto";
import { ApiError } from "../../apiError";
import { DeliveryAdapter, ParsedDeliveryOrder } from "../types";

// Generic adapter for any integration without a dedicated one below (a
// self-built ordering site, a regional aggregator, or a platform being
// tested before its own adapter is written). Documents the wire format
// third parties should send, rather than reverse-engineering an existing
// provider's proprietary API. Expected payload:
// {
//   "orderId": "abc123",
//   "status": "NEW",
//   "customerName": "Jane Tan",
//   "customerPhone": "+60123456789",
//   "deliveryAddress": "123 Jalan Ampang, KL",
//   "items": [{ "sku": "COF-001", "name": "Latte", "quantity": 2 }]
// }
// Signature: HMAC-SHA256 of the raw request body, hex-encoded, sent as the
// `X-Webhook-Signature` header — the same scheme most webhook providers use.
export const customAdapter: DeliveryAdapter = {
  verifySignature(rawBody, signatureHeader, webhookSecret) {
    if (!signatureHeader) return false;
    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },

  parseIncomingOrder(payload): ParsedDeliveryOrder {
    const p = payload as Record<string, unknown>;
    if (typeof p?.orderId !== "string" || !p.orderId) {
      throw ApiError.badRequest("Webhook payload missing `orderId`");
    }
    if (!Array.isArray(p.items) || p.items.length === 0) {
      throw ApiError.badRequest("Webhook payload must include a non-empty `items` array");
    }
    return {
      externalOrderId: p.orderId,
      externalStatus: typeof p.status === "string" ? p.status : undefined,
      customerName: typeof p.customerName === "string" ? p.customerName : undefined,
      customerPhone: typeof p.customerPhone === "string" ? p.customerPhone : undefined,
      deliveryAddress: typeof p.deliveryAddress === "string" ? p.deliveryAddress : undefined,
      items: (p.items as Record<string, unknown>[]).map((item) => {
        if (typeof item.sku !== "string" || !item.sku) {
          throw ApiError.badRequest("Each item must include a `sku`");
        }
        const quantity = Number(item.quantity ?? 1);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw ApiError.badRequest(`Invalid quantity for item ${item.sku}`);
        }
        return { externalSku: item.sku, name: typeof item.name === "string" ? item.name : item.sku, quantity };
      }),
    };
  },

  // No outbound status-push API for a generic/self-built integration —
  // accept/reject/ready transitions only update our own DeliveryOrder.
};
