import { CsvFormatter, csvLine, isoDate } from "../types";

// QuickBooks Online's 3-column journal entry CSV import layout (JournalNo /
// JournalDate / AccountName / Debits / Credits / Description). Each source
// Transaction becomes one JournalNo so its debit/credit rows import as a
// single balanced journal entry.
export const quickbooksCsv: CsvFormatter = (rows) => {
  const lines = [csvLine(["JournalNo", "JournalDate", "AccountName", "Debits", "Credits", "Description"])];
  for (const row of rows) {
    lines.push(
      csvLine([
        row.reference,
        isoDate(row.date),
        row.account,
        row.debit ? row.debit.toFixed(2) : "",
        row.credit ? row.credit.toFixed(2) : "",
        row.description,
      ])
    );
  }
  return lines.join("\r\n") + "\r\n";
};
