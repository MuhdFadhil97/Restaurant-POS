import { Discount, Product, ProductVariant, TaxRate } from "@prisma/client";

export interface LineInput {
  product: Product & { taxRate: TaxRate | null };
  variant: ProductVariant | null;
  quantity: number;
  discount: Discount | null;
}

export interface LineResult {
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

// v1 assumption (documented in memory.md): prices are tax-exclusive, and an
// order-level discount is applied after tax (reduces the final total but not
// the taxable base). This keeps per-line tax stable regardless of whether an
// order discount is later added/removed.
export function calculateLine(input: LineInput): LineResult {
  const unitPrice = Number(input.product.unitPrice) + Number(input.variant?.priceAdjustment ?? 0);
  const lineSubtotal = unitPrice * input.quantity;

  const discountAmount = input.discount ? applyDiscount(input.discount, lineSubtotal) : 0;
  const taxableAmount = Math.max(lineSubtotal - discountAmount, 0);
  const taxRate = input.product.taxRate ? Number(input.product.taxRate.rate) : 0;
  const taxAmount = round2(taxableAmount * (taxRate / 100));
  const lineTotal = round2(taxableAmount + taxAmount);

  return { unitPrice, discountAmount: round2(discountAmount), taxAmount, lineTotal };
}

export function applyDiscount(discount: Discount, base: number): number {
  const value = Number(discount.value);
  if (discount.type === "PERCENTAGE") {
    return Math.min(base * (value / 100), base);
  }
  return Math.min(value, base);
}

export interface ServiceChargeConfig {
  enabled: boolean;
  rate: number; // percentage, e.g. 10
  // Rate used to tax the service charge itself (Malaysian standard: service
  // charge is added to the taxable base). This is the outlet's default tax
  // rate, since the service charge isn't tied to any single line's product.
  taxRate: number;
}

export interface TotalsResult {
  subtotal: number;
  discountTotal: number;
  serviceChargeTotal: number;
  taxTotal: number;
  total: number;
}

// Order of operations follows the standard Malaysian F&B receipt: line
// discounts reduce the subtotal, the service charge is computed on that
// discounted subtotal, then tax is charged on (discounted subtotal + service
// charge). The order-level discount, like today, is applied last and reduces
// only the final total — not the service charge or tax base — so per-line
// tax and the service charge stay stable regardless of whether it's later
// added or removed.
export function calculateTotals(
  lines: LineResult[],
  lineSubtotals: number[],
  orderDiscount: Discount | null,
  serviceCharge: ServiceChargeConfig
): TotalsResult {
  const subtotal = round2(lineSubtotals.reduce((sum, s) => sum + s, 0));
  const lineDiscountTotal = round2(lines.reduce((sum, l) => sum + l.discountAmount, 0));
  const lineTaxTotal = round2(lines.reduce((sum, l) => sum + l.taxAmount, 0));
  const netSubtotal = round2(subtotal - lineDiscountTotal);

  const serviceChargeTotal = serviceCharge.enabled ? round2(netSubtotal * (serviceCharge.rate / 100)) : 0;
  const serviceChargeTax = round2(serviceChargeTotal * (serviceCharge.taxRate / 100));
  const taxTotal = round2(lineTaxTotal + serviceChargeTax);

  const orderDiscountAmount = orderDiscount ? round2(applyDiscount(orderDiscount, netSubtotal)) : 0;
  const discountTotal = round2(lineDiscountTotal + orderDiscountAmount);

  const total = round2(subtotal - discountTotal + serviceChargeTotal + taxTotal);

  return { subtotal, discountTotal, serviceChargeTotal, taxTotal, total };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
