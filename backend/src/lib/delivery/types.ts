// Shared shape every delivery-platform adapter normalizes its webhook
// payload into. Item resolution to a real Product happens in the orders
// service (via Product.sku), not here — an adapter only knows the
// platform's wire format.
export interface ParsedDeliveryItem {
  externalSku: string;
  name: string;
  quantity: number;
}

export interface ParsedDeliveryOrder {
  externalOrderId: string;
  externalStatus?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  items: ParsedDeliveryItem[];
}

// One adapter per DeliveryProvider value. verifySignature guards the webhook
// route before anything else runs; parseIncomingOrder never throws on
// unknown fields — it's forgiving of extra platform data and only requires
// the handful of fields the pipeline actually needs. pushStatusUpdate is
// optional: a platform without a status-push API (or one not wired up yet)
// simply has no outbound effect when staff accept/reject/mark ready.
export interface DeliveryAdapter {
  verifySignature(rawBody: string, signatureHeader: string | undefined, webhookSecret: string): boolean;
  parseIncomingOrder(payload: unknown): ParsedDeliveryOrder;
  pushStatusUpdate?(apiKey: string, externalOrderId: string, status: string): Promise<void>;
}
