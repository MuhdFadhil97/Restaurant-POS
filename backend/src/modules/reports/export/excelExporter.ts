import ExcelJS from "exceljs";
import { ReportData } from "../types";

function formatCode(format?: string): string | undefined {
  switch (format) {
    case "currency":
      return '"RM" #,##0.00';
    case "number":
      return "#,##0";
    case "percent":
      return "0.00%";
    case "date":
      return "yyyy-mm-dd";
    case "datetime":
      return "yyyy-mm-dd hh:mm";
    default:
      return undefined;
  }
}

export async function exportToExcel(report: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "POS Reports";
  workbook.created = new Date();

  const safeSheetName = report.title.replace(/[*?:\\/[\]]/g, "-").slice(0, 31) || "Report";
  const sheet = workbook.addWorksheet(safeSheetName);

  sheet.addRow([report.title]);
  sheet.getCell("A1").font = { bold: true, size: 14 };

  const metaLines: string[] = [];
  if (report.meta.outletName) metaLines.push(`Outlet: ${report.meta.outletName}`);
  if (report.meta.from && report.meta.to) {
    metaLines.push(`Period: ${new Date(report.meta.from).toLocaleDateString()} - ${new Date(report.meta.to).toLocaleDateString()}`);
  }
  metaLines.push(`Generated: ${new Date(report.meta.generatedAt).toLocaleString()}${report.meta.generatedBy ? ` by ${report.meta.generatedBy}` : ""}`);
  for (const line of metaLines) {
    sheet.addRow([line]);
  }
  sheet.addRow([]);

  const headerRowIndex = sheet.rowCount + 1;
  const headerRow = sheet.addRow(report.columns.map((c) => c.header));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    cell.border = { bottom: { style: "thin" } };
  });

  for (const row of report.rows) {
    const values = report.columns.map((c) => row[c.key] ?? null);
    sheet.addRow(values);
  }

  report.columns.forEach((col, i) => {
    const excelCol = sheet.getColumn(i + 1);
    excelCol.width = Math.max(col.header.length + 2, 14);
    const numFmt = formatCode(col.format);
    if (numFmt) {
      for (let r = headerRowIndex + 1; r <= sheet.rowCount; r++) {
        sheet.getCell(r, i + 1).numFmt = numFmt;
      }
    }
    if (col.align) {
      for (let r = headerRowIndex + 1; r <= sheet.rowCount; r++) {
        sheet.getCell(r, i + 1).alignment = { horizontal: col.align };
      }
    }
  });

  sheet.views = [{ state: "frozen", ySplit: headerRowIndex }];

  if (report.totals) {
    const totalsRow = report.columns.map((c) => report.totals?.[c.key] ?? "");
    const row = sheet.addRow(totalsRow);
    row.font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
