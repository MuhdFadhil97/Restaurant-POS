import { ReportData } from "../types";

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function formatCell(value: unknown, format?: string): string {
  if (value === null || value === undefined || value === "") return "";
  switch (format) {
    case "currency":
      return `RM ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "number":
      return Number(value).toLocaleString();
    case "percent":
      return `${Number(value).toFixed(2)}%`;
    case "date":
      return new Date(String(value)).toLocaleDateString();
    case "datetime":
      return new Date(String(value)).toLocaleString();
    default:
      return escapeHtml(value);
  }
}

export function renderReportHtml(report: ReportData): string {
  const metaLines: string[] = [];
  if (report.meta.outletName) metaLines.push(`Outlet: ${escapeHtml(report.meta.outletName)}`);
  if (report.meta.from && report.meta.to) {
    metaLines.push(
      `Period: ${new Date(report.meta.from).toLocaleDateString()} &ndash; ${new Date(report.meta.to).toLocaleDateString()}`
    );
  }
  if (report.meta.filtersApplied) {
    const extra = Object.entries(report.meta.filtersApplied)
      .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`)
      .join(" &middot; ");
    if (extra) metaLines.push(extra);
  }

  const headCells = report.columns
    .map((c) => `<th style="text-align:${c.align ?? (c.format === "text" || !c.format ? "left" : "right")}">${escapeHtml(c.header)}</th>`)
    .join("");

  const bodyRows = report.rows
    .map((row) => {
      const cells = report.columns
        .map(
          (c) =>
            `<td style="text-align:${c.align ?? (c.format === "text" || !c.format ? "left" : "right")}">${formatCell(row[c.key], c.format)}</td>`
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const totalsRow = report.totals
    ? `<tr class="totals">${report.columns
        .map(
          (c) =>
            `<td style="text-align:${c.align ?? "right"}">${formatCell(report.totals?.[c.key], c.format)}</td>`
        )
        .join("")}</tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 32px; font-size: 11px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { color: #6b7280; font-size: 10px; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
  th { background: #f3f4f6; font-weight: 600; border-bottom: 2px solid #d1d5db; }
  tr.totals td { font-weight: 700; border-top: 2px solid #d1d5db; }
  .footer { margin-top: 16px; color: #9ca3af; font-size: 9px; }
</style>
</head>
<body>
  <h1>${escapeHtml(report.title)}</h1>
  ${metaLines.map((l) => `<div class="meta">${l}</div>`).join("")}
  <table>
    <thead><tr>${headCells}</tr></thead>
    <tbody>${bodyRows || `<tr><td colspan="${report.columns.length}" style="text-align:center;color:#9ca3af;padding:16px;">No data for this period.</td></tr>`}${totalsRow}</tbody>
  </table>
  <div class="footer">Generated ${new Date(report.meta.generatedAt).toLocaleString()}${report.meta.generatedBy ? ` by ${escapeHtml(report.meta.generatedBy)}` : ""}</div>
</body>
</html>`;
}
