import { ChangeEvent, useState } from "react";
import { downloadBulkAdjustmentTemplate, useBulkAdjustProducts, usePreviewBulkAdjustProducts } from "@/api/products";
import { getErrorMessage } from "@/api/client";
import { BulkAdjustPreview, BulkAdjustRowAction, BulkAdjustSummary } from "@/api/types";
import { Badge, Button, ErrorMessage, Modal } from "@/components/ui";

const ACTION_LABEL: Record<BulkAdjustRowAction, string> = {
  adjust: "Adjust",
  invalid: "Invalid",
};

const ACTION_COLOR: Record<BulkAdjustRowAction, "green" | "blue" | "yellow" | "red"> = {
  adjust: "green",
  invalid: "red",
};

export function BulkAdjustmentModal({
  open,
  outletId,
  onClose,
}: {
  open: boolean;
  outletId?: number;
  onClose: () => void;
}) {
  const previewBulkAdjust = usePreviewBulkAdjustProducts();
  const bulkAdjust = useBulkAdjustProducts();
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkAdjustPreview | null>(null);
  const [summary, setSummary] = useState<BulkAdjustSummary | null>(null);

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
    if (!csv || !outletId) return;
    setError(null);
    setSummary(null);
    try {
      const result = await previewBulkAdjust.mutateAsync({ csv, outletId });
      setPreview(result);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleConfirm() {
    if (!csv || !outletId) return;
    setError(null);
    try {
      const result = await bulkAdjust.mutateAsync({ csv, outletId });
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
    <Modal open={open} onClose={handleClose} title="Bulk Adjustment (Import)">
      <div className="space-y-4">
        {showPicker && (
          <>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                Upload a CSV file to adjust price, cost, low stock threshold and/or stock quantity for products that
                already exist — each row is matched to an existing product by its SKU code. Unknown SKUs are reported
                as errors, not created. Leave a cell blank to leave that field unchanged. Stock changes apply to the
                currently selected outlet and are recorded as inventory movements, just like a manual stock
                adjustment.
              </p>
              <button
                type="button"
                onClick={() => downloadBulkAdjustmentTemplate()}
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
              Review what will happen before saving. Rows are matched by SKU code — only existing products are
              adjusted.
            </p>
            <div className="flex gap-4 text-sm flex-wrap">
              <span className="text-green-700 font-medium">{preview.toAdjust} to adjust</span>
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
                    <th className="px-3 py-1.5">Changes / Notes</th>
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
            <p className="text-sm font-medium text-gray-700">Bulk adjustment complete</p>
            <div className="flex gap-4 text-sm">
              <span className="text-green-700 font-medium">{summary.adjusted} adjusted</span>
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
              <Button type="button" onClick={handleConfirm} disabled={bulkAdjust.isPending || preview.toAdjust === 0}>
                {bulkAdjust.isPending ? "Saving..." : "Confirm Adjustment"}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={handleClose}>
                Close
              </Button>
              {!summary && (
                <Button type="button" onClick={handlePreview} disabled={!csv || !outletId || previewBulkAdjust.isPending}>
                  {previewBulkAdjust.isPending ? "Checking..." : "Preview Adjustment"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
