import { ChangeEvent, useState } from "react";
import { downloadProductImportTemplate, useImportProducts, usePreviewImportProducts } from "@/api/products";
import { getErrorMessage } from "@/api/client";
import { ImportPreview, ImportRowAction, ImportSummary } from "@/api/types";
import { Badge, Button, ErrorMessage, Modal } from "@/components/ui";

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

export function ImportProductsModal({
  open,
  outletId,
  onClose,
}: {
  open: boolean;
  outletId?: string;
  onClose: () => void;
}) {
  const previewImport = usePreviewImportProducts();
  const importProducts = useImportProducts();
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  function reset() {
    setFileName(null);
    setCsv(null);
    setError(null);
    setPreview(null);
    setSummary(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(null);
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
      setPreview(result);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleConfirm() {
    if (!csv) return;
    setError(null);
    try {
      const result = await importProducts.mutateAsync({ csv, outletId });
      setSummary(result);
      setPreview(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleBack() {
    setPreview(null);
    setError(null);
  }

  const showPicker = !preview && !summary;

  return (
    <Modal open={open} onClose={handleClose} title="Import Products">
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

        {preview && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Review what will happen before saving. Rows are matched by SKU code — existing SKUs are updated (or
              restored if previously deleted), new SKUs are created.
            </p>
            <div className="flex gap-4 text-sm flex-wrap">
              <span className="text-green-700 font-medium">{preview.toCreate} to create</span>
              <span className="text-blue-700 font-medium">{preview.toUpdate} to update</span>
              {preview.toRestore > 0 && (
                <span className="text-yellow-700 font-medium">{preview.toRestore} to restore</span>
              )}
              <span className={preview.invalid ? "text-red-700 font-medium" : "text-gray-400"}>
                {preview.invalid} invalid
              </span>
              <span className="text-gray-400">of {preview.totalRows} rows</span>
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 text-left sticky top-0">
                  <tr>
                    <th className="px-3 py-1.5">Row</th>
                    <th className="px-3 py-1.5">SKU</th>
                    <th className="px-3 py-1.5">Name</th>
                    <th className="px-3 py-1.5">Action</th>
                    <th className="px-3 py-1.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.rows.map((r) => (
                    <tr key={r.row} className={r.action === "invalid" ? "bg-red-50" : undefined}>
                      <td className="px-3 py-1.5">{r.row}</td>
                      <td className="px-3 py-1.5">{r.sku ?? "-"}</td>
                      <td className="px-3 py-1.5">{r.name ?? "-"}</td>
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
          {preview ? (
            <>
              <Button type="button" variant="secondary" onClick={handleBack}>
                Back
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={importProducts.isPending || preview.toCreate + preview.toUpdate + preview.toRestore === 0}
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
    </Modal>
  );
}
