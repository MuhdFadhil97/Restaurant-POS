import { LedgerRow } from "./types";

// Just enough of Transaction (+ nested items/payments) shape to build ledger
// rows — see modules/accountingExport/service.ts for the actual Prisma query.
export interface LedgerTransaction {
  receiptNumber: string | null;
  createdAt: Date;
  discountTotal: number;
  serviceChargeTotal: number;
  taxTotal: number;
  total: number;
  items: {
    lineTotal: number;
    taxAmount: number;
    discountAmount: number;
    product: { category: { name: string; accountingCategory: string | null } | null };
  }[];
  payments: { method: string; amount: number }[];
}

const PAYMENT_ACCOUNT_LABEL: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card Receivable",
  EWALLET: "E-Wallet Receivable",
  GIFT_CARD: "Gift Card Liability",
  LOYALTY_POINTS: "Loyalty Points Liability",
  ONLINE: "Delivery Platform Receivable",
};

function resolveAccount(category: { name: string; accountingCategory: string | null } | null): string {
  if (!category) return "Uncategorized Sales";
  return category.accountingCategory?.trim() || category.name;
}

// Turns one completed Transaction into a small balanced set of ledger rows:
// a credit per revenue account represented in its items, a credit for tax
// and service charge, a debit contra-row for any order-level discount, and
// a debit per payment method actually collected. Debits and credits always
// sum equal (see the accompanying test/derivation in planning.md 9.3) since
// every figure is read straight off numbers the checkout pipeline already
// computed and reconciled.
export function buildLedgerRows(transaction: LedgerTransaction): LedgerRow[] {
  const reference = transaction.receiptNumber ?? "(no receipt #)";
  const rows: LedgerRow[] = [];

  const revenueByAccount = new Map<string, number>();
  let itemDiscountTotal = 0;
  for (const item of transaction.items) {
    const account = resolveAccount(item.product.category);
    const netAmount = round2(item.lineTotal - item.taxAmount);
    revenueByAccount.set(account, round2((revenueByAccount.get(account) ?? 0) + netAmount));
    itemDiscountTotal = round2(itemDiscountTotal + item.discountAmount);
  }

  for (const [account, amount] of revenueByAccount) {
    if (amount <= 0) continue;
    rows.push({
      date: transaction.createdAt,
      reference,
      description: `Sales - ${account}`,
      account,
      debit: 0,
      credit: amount,
      taxAmount: 0,
    });
  }

  const orderDiscount = round2(transaction.discountTotal - itemDiscountTotal);
  if (orderDiscount > 0) {
    rows.push({
      date: transaction.createdAt,
      reference,
      description: "Order-level discount",
      account: "Sales Discounts",
      debit: orderDiscount,
      credit: 0,
      taxAmount: 0,
    });
  }

  if (transaction.serviceChargeTotal > 0) {
    rows.push({
      date: transaction.createdAt,
      reference,
      description: "Service charge",
      account: "Service Charge Revenue",
      debit: 0,
      credit: transaction.serviceChargeTotal,
      taxAmount: 0,
    });
  }

  if (transaction.taxTotal > 0) {
    rows.push({
      date: transaction.createdAt,
      reference,
      description: "Sales tax collected",
      account: "Sales Tax Payable",
      debit: 0,
      credit: transaction.taxTotal,
      taxAmount: transaction.taxTotal,
    });
  }

  // A cash Payment records the amount actually tendered, which can exceed
  // the transaction total (change is handed back but not stored as its own
  // row) — so ledger debits are capped at what's still owed, in payment
  // order, rather than trusting each payment.amount verbatim. Non-cash
  // methods are always tendered exact, so this is a no-op for them.
  let remaining = transaction.total;
  for (const payment of transaction.payments) {
    const applied = round2(Math.min(payment.amount, Math.max(remaining, 0)));
    remaining = round2(remaining - applied);
    if (applied <= 0) continue;
    const account = PAYMENT_ACCOUNT_LABEL[payment.method] ?? payment.method;
    rows.push({
      date: transaction.createdAt,
      reference,
      description: `Payment received - ${account}`,
      account,
      debit: applied,
      credit: 0,
      taxAmount: 0,
    });
  }

  return rows;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
