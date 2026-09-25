import { CsvFormatter, csvLine, isoDate } from "../types";

// Plain, tool-agnostic ledger CSV — the fallback format when the target
// bookkeeping software isn't QuickBooks or Xero specifically.
export const genericCsv: CsvFormatter = (rows) => {
  const lines = [csvLine(["Date", "Reference", "Description", "Account", "Debit", "Credit", "Tax Amount"])];
  for (const row of rows) {
    lines.push(
      csvLine([
        isoDate(row.date),
        row.reference,
        row.description,
        row.account,
        row.debit ? row.debit.toFixed(2) : "",
        row.credit ? row.credit.toFixed(2) : "",
        row.taxAmount ? row.taxAmount.toFixed(2) : "",
      ])
    );
  }
  return lines.join("\r\n") + "\r\n";
};
