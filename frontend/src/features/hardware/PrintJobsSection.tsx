import { useState } from "react";
import { usePrintJobs, useRetryPrintJob } from "@/api/printJobs";
import { PrintJobKind, PrintJobStatus } from "@/api/types";
import { Card, Select } from "@/components/ui";
import { PrintJobStatusBadge } from "./PrintJobStatus";

const kindLabels: Record<PrintJobKind, string> = {
  RECEIPT: "Receipt",
  KITCHEN_TICKET: "Kitchen ticket",
  DRAWER_KICK: "Open drawer",
  TEST: "Test page",
};

export function PrintJobsSection({ outletId }: { outletId: number }) {
  const [status, setStatus] = useState<PrintJobStatus | "">("");
  const { data: jobs } = usePrintJobs(outletId, status || undefined);
  const retry = useRetryPrintJob();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={status} onChange={(e) => setStatus(e.target.value as PrintJobStatus | "")} className="max-w-[12rem]">
          <option value="">All jobs</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Queued</option>
          <option value="PRINTED">Printed</option>
        </Select>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Printer</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Details</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {jobs?.map((j) => (
              <tr key={j.id} className="border-t border-gray-100">
                <td className="px-4 py-2 whitespace-nowrap">{new Date(j.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">
                  {kindLabels[j.kind]}
                  {j.transactionId && <span className="text-gray-400"> · #{j.transactionId}</span>}
                </td>
                <td className="px-4 py-2">{j.printer.name}</td>
                <td className="px-4 py-2">
                  <PrintJobStatusBadge status={j.status} />
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {j.lastError ?? (j.attempts > 1 ? `${j.attempts} attempts` : "")}
                </td>
                <td className="px-4 py-2 text-right">
                  {j.status === "FAILED" && (
                    <button
                      onClick={() => retry.mutate(j.id)}
                      disabled={retry.isPending}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {jobs?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No print jobs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
