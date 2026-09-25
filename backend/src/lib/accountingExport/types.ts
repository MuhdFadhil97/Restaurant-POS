// One line of a double-entry ledger derived from completed sales — never a
// new source of truth, just a reshaping of Transaction/TransactionItem/
// Payment figures already computed at checkout.
export interface LedgerRow {
  date: Date;
  reference: string; // Transaction.receiptNumber
  description: string;
  account: string; // resolved from ProductCategory.accountingCategory, or a fixed account for tax/discount/payment rows
  debit: number;
  credit: number;
  taxAmount: number;
}

// A pure function turning ledger rows into a specific bookkeeping tool's
// CSV import layout. Each format file in ./formats implements exactly this.
export type CsvFormatter = (rows: LedgerRow[]) => string;

export function csvField(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function csvLine(fields: (string | number)[]): string {
  return fields.map(csvField).join(",");
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
