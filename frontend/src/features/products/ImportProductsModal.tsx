import { ChangeEvent, useState } from "react";
import { downloadProductImportTemplate, useImportProducts, usePreviewImportProducts } from "@/api/products";
import { getErrorMessage } from "@/api/client";
import { ImportPreviewRow, ImportRowAction, ImportSummary } from "@/api/types";
import { Badge, Button, ErrorMessage, Modal } from "@/components/ui";
import { ImportRowEditModal } from "./ImportRowEditModal";

const ACTION_LABEL: Record<ImportRowAction, string> = {
  create: "Create",
  update: "Update",
  restore: "Restore",
  invalid: "Invalid",
};

const ACTION_COLOR: Record<ImportRowAction, "green" | "blue" | "yellow" | "red"> = {
  create: "green",
  update: "blue",
  restore: "yellow",
  invalid: "red",
};

function rowsToCsv(rows: ImportPreviewRow[]): string {
  const headers = Object.keys(rows[0]?.data ?? {});
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return (
    [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r.data[h] ?? "")).join(","))].join("\n") + "\n"
  );
}

function countByAction(rows: ImportPreviewRow[]) {
  return {
    totalRows: rows.length,
    toCreate: rows.filter((r) => r.action === "create").length,
    toUpdate: rows.filter((r) => r.action === "update").length,
    toRestore: rows.filter((r) => r.action === "restore").length,
    invalid: rows.filter((r) => r.action === "invalid").length,
  };
}

export function ImportProductsModal({
  open,
  outletId,
  onClose,
}: {
  open: boolean;
  outletId?: number;
  onClose: () => void;
}) {
  const previewImport = usePreviewImportProducts();
  const importProducts = useImportProducts();
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportPreviewRow[] | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [editingRow, setEditingRow] = useState<ImportPreviewRow | null>(null);

  function reset() {
    setFileName(null);
    setCsv(null);
    setError(null);
    setRows(null);
    setSummary(null);
    setEditingRow(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setRows(null);
    setSummary(null);
    setError(null);
    if (!file) {
      setFileName(null);
      setCsv(null);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.onerror = () => setError("Could not read the selected file");
    reader.readAsText(file);
  }

  async function handlePreview() {
    if (!csv) return;
    setError(null);
    setSummary(null);
    try {
      const result = await previewImport.mutateAsync({ csv, outletId });
      setRows(result.rows);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleConfirm() {
    if (!rows || rows.length === 0) return;
    setError(null);
    try {
      const result = await importProducts.mutateAsync({ csv: rowsToCsv(rows), outletId });
      setSummary(result);
      setRows(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleBack() {
    setRows(null);
    setError(null);
  }

  function handleDeleteRow(row: ImportPreviewRow) {
    setRows((prev) => (prev ? prev.filter((r) => r !== row) : prev));
  }

  async function handleSaveEditedRow(data: Record<string, string>) {
    if (!rows || !editingRow) return;
    const updatedRows = rows.map((r) => (r === editingRow ? { ...r, data } : r));
    setEditingRow(null);
    setError(null);
    try {
      const result = await previewImport.mutateAsync({ csv: rowsToCsv(updatedRows), outletId });
      setRows(result.rows);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const counts = rows ? countByAction(rows) : null;
  const showPicker = !rows && !summary;

  return (
    <Modal open={open} onClose={handleClose} title="Import Products" maxWidthClassName="max-w-6xl">
      <div className="space-y-4">
        {showPicker && (
          <>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                Upload a CSV file to bulk create or update products — each row is matched to an existing product by
                its SKU code. Category, tax rate and kitchen station are matched by name — categories are created
                automatically if missing, but tax rates and stations must already exist for the current outlet.
              </p>
              <button
                type="button"
                onClick={() => downloadProductImportTemplate()}
                className="text-brand-600 hover:underline font-medium"
              >
                Download sample template
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
              />
              {fileName && <p className="text-xs text-gray-400 mt-1">Selected: {fileName}</p>}
            </div>
          </>
        )}

        {error && <ErrorMessage message={error} />}

        {rows && counts && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Review what will happen before saving. Rows are matched by SKU code — existing SKUs are updated (or
              restored if previously deleted), new SKUs are created. Use Edit to fix a row (it will be re-checked) or
              Delete to leave it out of the import.
            </p>
            <div className="flex gap-4 text-sm flex-wrap">
              <span className="text-green-700 font-medium">{counts.toCreate} to create</span>
              <span className="text-blue-700 font-medium">{counts.toUpdate} to update</span>
              {counts.toRestore > 0 && (
                <span className="text-yellow-700 font-medium">{counts.toRestore} to restore</span>
              )}
              <span className={counts.invalid ? "text-red-700 font-medium" : "text-gray-400"}>
                {counts.invalid} invalid
              </span>
              <span className="text-gray-400">of {counts.totalRows} rows</span>
            </div>
            <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 text-left sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-1.5 sticky left-0 bg-gray-50 z-20">Actions</th>
                    <th className="px-3 py-1.5">SKU</th>
                    <th className="px-3 py-1.5">Name</th>
                    <th className="px-3 py-1.5">Unit Price</th>
                    <th className="px-3 py-1.5">Cost Price</th>
                    <th className="px-3 py-1.5">Unit of Measure</th>
                    <th className="px-3 py-1.5">Low Stock Threshold</th>
                    <th className="px-3 py-1.5">Category</th>
                    <th className="px-3 py-1.5">Tax Rate</th>
                    <th className="px-3 py-1.5">Kitchen Station</th>
                    <th className="px-3 py-1.5">Action</th>
                    <th className="px-3 py-1.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.row} className={r.action === "invalid" ? "bg-red-50" : undefined}>
                      <td
                        className={`px-3 py-1.5 sticky left-0 z-10 ${r.action === "invalid" ? "bg-red-50" : "bg-white"}`}
                      >
                        <button
                          type="button"
                          onClick={() => setEditingRow(r)}
                          className="text-brand-600 hover:underline mr-2"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(r)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                      <td className="px-3 py-1.5">{r.data.sku || r.sku || "-"}</td>
                      <td className="px-3 py-1.5">{r.data.name || r.name || "-"}</td>
                      <td className="px-3 py-1.5">{r.data.unitPrice || "-"}</td>
                      <td className="px-3 py-1.5">{r.data.costPrice || "-"}</td>
                      <td className="px-3 py-1.5">{r.data.unitOfMeasure || "-"}</td>
                      <td className="px-3 py-1.5">{r.data.lowStockThreshold || "-"}</td>
                      <td className="px-3 py-1.5">{r.data.category || "-"}</td>
                      <td className="px-3 py-1.5">{r.data.taxRate || "-"}</td>
                      <td className="px-3 py-1.5">{r.data.station || "-"}</td>
                      <td className="px-3 py-1.5">
                        <Badge color={ACTION_COLOR[r.action]}>{ACTION_LABEL[r.action]}</Badge>
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">{r.error ?? r.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {summary && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Import complete</p>
            <div className="flex gap-4 text-sm">
              <span className="text-green-700 font-medium">{summary.created} created</span>
              <span className="text-blue-700 font-medium">{summary.updated} updated</span>
              <span className={summary.failed ? "text-red-700 font-medium" : "text-gray-400"}>
                {summary.failed} failed
              </span>
              <span className="text-gray-400">of {summary.totalRows} rows</span>
            </div>
            {summary.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-red-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 text-red-700 text-left">
                    <tr>
                      <th className="px-3 py-1.5">Row</th>
                      <th className="px-3 py-1.5">SKU</th>
                      <th className="px-3 py-1.5">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {summary.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">{e.row}</td>
                        <td className="px-3 py-1.5">{e.sku ?? "-"}</td>
                        <td className="px-3 py-1.5">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {rows && counts ? (
            <>
              <Button type="button" variant="secondary" onClick={handleBack}>
                Back
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={importProducts.isPending || counts.toCreate + counts.toUpdate + counts.toRestore === 0}
              >
                {importProducts.isPending ? "Saving..." : "Confirm Import"}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={handleClose}>
                Close
              </Button>
              {!summary && (
                <Button type="button" onClick={handlePreview} disabled={!csv || previewImport.isPending}>
                  {previewImport.isPending ? "Checking..." : "Preview Import"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {editingRow && (
        <ImportRowEditModal
          key={editingRow.row}
          open
          outletId={outletId}
          data={editingRow.data}
          onClose={() => setEditingRow(null)}
          onSave={handleSaveEditedRow}
        />
      )}
    </Modal>
  );
}
