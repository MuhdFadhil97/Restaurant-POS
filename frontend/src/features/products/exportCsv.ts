import { Product } from "@/api/types";

const EXPORT_HEADERS = [
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
  "stock",
];

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildProductsExportCsv(products: Product[]): string {
  const showCost = products.some((p) => p.costPrice !== undefined);
  const headers = showCost ? EXPORT_HEADERS : EXPORT_HEADERS.filter((h) => h !== "costPrice");

  const rows = products.map((p) => {
    const row: Record<string, string> = {
      sku: p.sku,
      name: p.name,
      category: p.category?.name ?? "",
      unitPrice: String(p.unitPrice),
      costPrice: p.costPrice !== undefined ? String(p.costPrice) : "",
      unitOfMeasure: p.unitOfMeasure,
      taxRate: p.taxRate?.name ?? "",
      station: p.station?.name ?? "",
      lowStockThreshold: String(p.lowStockThreshold),
      isActive: p.isActive ? "true" : "false",
      stock: String(p.stocks?.[0]?.quantity ?? 0),
    };
    return headers.map((h) => csvEscape(row[h])).join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

export function downloadProductsCsv(products: Product[], outletName: string) {
  const csv = buildProductsExportCsv(products);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const safeOutletName = outletName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "outlet";

  const a = document.createElement("a");
  a.href = url;
  a.download = `products-export-${safeOutletName}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
