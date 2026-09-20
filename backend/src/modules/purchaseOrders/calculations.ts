import { TaxRate } from "@prisma/client";

// Mirrors transactions/calculations.ts: prices are tax-exclusive, and a line
// discount is applied before tax (reduces the taxable base).
export interface LineItemInput {
  quantityOrdered: number;
  unitCost: number;
  discountAmount: number;
  taxRate: TaxRate | null;
}

export interface LineItemResult {
  taxAmount: number;
  lineTotal: number;
}

export function calculateItemLine(input: LineItemInput): LineItemResult {
  const lineSubtotal = input.quantityOrdered * input.unitCost;
  const taxableAmount = Math.max(lineSubtotal - input.discountAmount, 0);
  const taxRate = input.taxRate ? Number(input.taxRate.rate) : 0;
  const taxAmount = round2(taxableAmount * (taxRate / 100));
  const lineTotal = round2(taxableAmount + taxAmount);
  return { taxAmount, lineTotal };
}

export interface OrderTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
}

interface OrderTotalsLine {
  quantityOrdered: number;
  unitCost: number;
  discountAmount: number;
  taxAmount: number;
}

export function calculateOrderTotals(lines: OrderTotalsLine[]): OrderTotals {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.quantityOrdered * l.unitCost, 0));
  const discountTotal = round2(lines.reduce((sum, l) => sum + l.discountAmount, 0));
  const taxTotal = round2(lines.reduce((sum, l) => sum + l.taxAmount, 0));
  const total = round2(subtotal - discountTotal + taxTotal);
  return { subtotal, discountTotal, taxTotal, total };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
