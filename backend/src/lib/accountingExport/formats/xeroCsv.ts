import { CsvFormatter, csvLine, isoDate } from "../types";

// Xero's manual journal import layout (*Narration / *Date / *AccountCode /
// *Description / *TaxRate / *Debit / *Credit). Xero expects an account
// *code*, not a name — since this app only has a free-text account label
// per category (ProductCategory.accountingCategory), it's passed through
// as the code; the bookkeeper maps/renames it to a real chart-of-accounts
// code once in Xero, same one-time step QuickBooks' "AccountName" column
// needs on that side.
export const xeroCsv: CsvFormatter = (rows) => {
  const lines = [csvLine(["*Narration", "*Date", "*AccountCode", "*Description", "*TaxRate", "*Debit", "*Credit"])];
  for (const row of rows) {
    lines.push(
      csvLine([
        row.reference,
        isoDate(row.date),
        row.account,
        row.description,
        "Tax Exclusive",
        row.debit ? row.debit.toFixed(2) : "",
        row.credit ? row.credit.toFixed(2) : "",
      ])
    );
  }
  return lines.join("\r\n") + "\r\n";
};
