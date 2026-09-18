import { ReportColumn } from "@/api/reports";
import { money } from "@/features/pos/cartMath";

function formatValue(value: unknown, format?: ReportColumn["format"]): string {
  if (value === null || value === undefined || value === "") return "-";
  switch (format) {
    case "currency":
      return money(Number(value));
    case "number":
      return Number(value).toLocaleString();
    case "percent":
      return `${Number(value).toFixed(2)}%`;
    case "date":
      return new Date(String(value)).toLocaleDateString();
    case "datetime":
      return new Date(String(value)).toLocaleString();
    default:
      return typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  }
}

export function GenericReportTable({
  columns,
  rows,
}: {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="text-gray-500 text-left">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="py-1 pr-4"
                style={{ textAlign: c.align ?? (c.format && c.format !== "text" ? "right" : "left") }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-100">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="py-1.5 pr-4"
                  style={{ textAlign: c.align ?? (c.format && c.format !== "text" ? "right" : "left") }}
                >
                  {formatValue(row[c.key], c.format)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-4 text-center text-gray-400">
                No data for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
