import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { Button, Card, ErrorMessage, Select, Spinner } from "@/components/ui";
import {
  AccountingExportFormat,
  downloadAccountingExportRun,
  useAccountingExportRuns,
  useCreateAccountingExportRun,
} from "@/api/accountingExport";
import { ReportFilterBar, startOfTodayDateInput, toIsoRange } from "./components/ReportFilterBar";

const FORMAT_LABELS: Record<AccountingExportFormat, string> = {
  GENERIC_CSV: "Generic CSV",
  QUICKBOOKS_CSV: "QuickBooks CSV (journal import)",
  XERO_CSV: "Xero CSV (manual journal import)",
};

export function AccountingExportTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [range, setRange] = useState({ from: startOfTodayDateInput(), to: startOfTodayDateInput() });
  const [format, setFormat] = useState<AccountingExportFormat>("GENERIC_CSV");

  const { data: runs, isLoading, isError } = useAccountingExportRuns(outletId ?? undefined);
  const createRun = useCreateAccountingExportRun();

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  async function handleGenerate() {
    const { from, to } = toIsoRange(range);
    await createRun.mutateAsync({ outletId: outletId!, format, periodStart: from, periodEnd: to });
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Generate Export</h2>
        <p className="text-sm text-gray-500">
          Builds a ledger of completed sales for the selected period, mapped to accounting categories set under Settings
          → Categories, and saves it as a downloadable CSV.
        </p>
        <ReportFilterBar
          range={range}
          onRangeChange={setRange}
          extra={
            <Select value={format} onChange={(e) => setFormat(e.target.value as AccountingExportFormat)} className="w-64">
              {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          }
        />
        <Button onClick={handleGenerate} disabled={createRun.isPending}>
          {createRun.isPending ? "Generating…" : "Generate Export"}
        </Button>
        {createRun.isError && <ErrorMessage message="Failed to generate export." />}
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Generated</th>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2">Format</th>
              <th className="px-4 py-2 text-right">Rows</th>
              <th className="px-4 py-2">By</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Spinner />
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8">
                  <ErrorMessage message="Failed to load export history." />
                </td>
              </tr>
            )}
            {runs?.map((run) => (
              <tr key={run.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{new Date(run.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">
                  {new Date(run.periodStart).toLocaleDateString()} – {new Date(run.periodEnd).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">{FORMAT_LABELS[run.format]}</td>
                <td className="px-4 py-2 text-right">{run.rowCount}</td>
                <td className="px-4 py-2">{run.requestedBy.name}</td>
                <td className="px-4 py-2 text-right">
                  {run.status === "COMPLETED" ? (
                    <button onClick={() => downloadAccountingExportRun(run)} className="text-brand-600 hover:underline">
                      Download
                    </button>
                  ) : (
                    <span className="text-red-500">Failed</span>
                  )}
                </td>
              </tr>
            ))}
            {runs?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No exports generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
