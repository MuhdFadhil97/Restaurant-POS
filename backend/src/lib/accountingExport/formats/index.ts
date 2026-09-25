import { AccountingExportFormat } from "@prisma/client";
import { CsvFormatter } from "../types";
import { genericCsv } from "./genericCsv";
import { quickbooksCsv } from "./quickbooksCsv";
import { xeroCsv } from "./xeroCsv";

const formatters: Record<AccountingExportFormat, CsvFormatter> = {
  GENERIC_CSV: genericCsv,
  QUICKBOOKS_CSV: quickbooksCsv,
  XERO_CSV: xeroCsv,
};

export function getFormatter(format: AccountingExportFormat): CsvFormatter {
  return formatters[format];
}
