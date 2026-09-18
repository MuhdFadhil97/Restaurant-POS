import { Discount, Product, ProductVariant } from "@/api/types";

export interface LocalCartItem {
  key: string;
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
  discount: Discount | null;
}

export interface LinePreview {
  lineSubtotal: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

function applyDiscountPreview(discount: Discount | null, base: number): number {
  if (!discount) return 0;
  if (discount.type === "PERCENTAGE") return Math.min(base * (discount.value / 100), base);
  return Math.min(discount.value, base);
}

export function previewLine(item: LocalCartItem): LinePreview {
  const unitPrice = Number(item.product.unitPrice) + Number(item.variant?.priceAdjustment ?? 0);
  const lineSubtotal = unitPrice * item.quantity;
  const discountAmount = round2(applyDiscountPreview(item.discount, lineSubtotal));
  const taxable = Math.max(lineSubtotal - discountAmount, 0);
  const taxRate = Number(item.product.taxRate?.rate ?? 0);
  const taxAmount = round2(taxable * (taxRate / 100));
  const lineTotal = round2(taxable + taxAmount);
  return { lineSubtotal, unitPrice, discountAmount, taxAmount, lineTotal };
}

export interface ServiceChargeConfig {
  enabled: boolean;
  rate: number; // percentage, e.g. 10
  taxRate: number; // outlet's default tax rate, applied to the service charge itself
}

export interface TotalsPreview {
  subtotal: number;
  discountTotal: number;
  serviceChargeTotal: number;
  taxTotal: number;
  total: number;
}

// Mirrors calculateTotals in backend/src/modules/transactions/calculations.ts
// (Malaysian F&B order: discount -> service charge -> tax on top of both).
export function previewTotals(
  items: LocalCartItem[],
  orderDiscount: Discount | null,
  serviceCharge: ServiceChargeConfig
): TotalsPreview {
  const lines = items.map(previewLine);
  const subtotal = round2(lines.reduce((s, l) => s + l.lineSubtotal, 0));
  const lineDiscountTotal = round2(lines.reduce((s, l) => s + l.discountAmount, 0));
  const lineTaxTotal = round2(lines.reduce((s, l) => s + l.taxAmount, 0));
  const netSubtotal = round2(subtotal - lineDiscountTotal);

  const serviceChargeTotal = serviceCharge.enabled ? round2(netSubtotal * (serviceCharge.rate / 100)) : 0;
  const serviceChargeTax = round2(serviceChargeTotal * (serviceCharge.taxRate / 100));
  const taxTotal = round2(lineTaxTotal + serviceChargeTax);

  const orderDiscountAmount = round2(applyDiscountPreview(orderDiscount, netSubtotal));
  const discountTotal = round2(lineDiscountTotal + orderDiscountAmount);
  const total = round2(subtotal - discountTotal + serviceChargeTotal + taxTotal);
  return { subtotal, discountTotal, serviceChargeTotal, taxTotal, total };
}

export function money(n: number): string {
  return `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
