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

export interface TotalsResult {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
}

export function calculateTotals(
  lines: LineResult[],
  lineSubtotals: number[],
  orderDiscount: Discount | null
): TotalsResult {
  const subtotal = round2(lineSubtotals.reduce((sum, s) => sum + s, 0));
  const lineDiscountTotal = round2(lines.reduce((sum, l) => sum + l.discountAmount, 0));
  const taxTotal = round2(lines.reduce((sum, l) => sum + l.taxAmount, 0));

  const orderDiscountAmount = orderDiscount
    ? round2(applyDiscount(orderDiscount, subtotal - lineDiscountTotal))
    : 0;
  const discountTotal = round2(lineDiscountTotal + orderDiscountAmount);

  const total = round2(subtotal - discountTotal + taxTotal);

  return { subtotal, discountTotal, taxTotal, total };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
