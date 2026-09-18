// Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes ("") and
// commas/newlines inside quotes. Good enough for a small product import file.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n") {
      pushRow();
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export function csvRowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = (row[i] ?? "").trim();
    });
    return obj;
  });
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(headers: string[], rows: (string | number | boolean)[][]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(row.map((cell) => csvEscape(String(cell))).join(","));
  }
  return lines.join("\n") + "\n";
}

export const PRODUCT_IMPORT_HEADERS = [
  "sku",
  "name",
  "category",
  "unitPrice",
  "costPrice",
  "unitOfMeasure",
  "taxRate",
  "station",
  "lowStockThreshold",
  "isActive",
  "imageUrl",
];

export function buildProductImportTemplate(): string {
  return toCsv(PRODUCT_IMPORT_HEADERS, [
    ["SKU-001", "Chicken Rice", "Food", "8.50", "3.20", "plate", "Standard Tax", "Kitchen", "10", "true", ""],
    ["SKU-002", "Iced Lemon Tea", "Beverages", "4.00", "1.00", "cup", "Standard Tax", "Bar", "20", "true", ""],
    ["SKU-003", "French Fries", "Food", "5.00", "1.80", "plate", "Standard Tax", "Kitchen", "15", "true", ""],
  ]);
}

// Bulk Adjustment targets existing products only (matched by SKU) — it never creates
// products. Each row can tweak pricing/threshold fields and/or move stock; leave a cell
// blank to leave that field unchanged.
export const BULK_ADJUSTMENT_HEADERS = [
  "sku",
  "newUnitPrice",
  "newCostPrice",
  "lowStockThreshold",
  "stockAdjustmentType",
  "stockQuantityChange",
  "reason",
];

export function buildBulkAdjustmentTemplate(): string {
  return toCsv(BULK_ADJUSTMENT_HEADERS, [
    ["SKU-001", "9.00", "", "", "RESTOCK", "50", "New delivery from supplier"],
    ["SKU-002", "", "1.20", "15", "", "", ""],
    ["SKU-003", "", "", "", "WASTAGE", "5", "Spoiled stock"],
  ]);
}
