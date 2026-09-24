import { useEffect, useState } from "react";
import { usePrintJob, useReprintReceipt, useRetryPrintJob } from "@/api/printJobs";
import { getErrorMessage } from "@/api/client";
import { PrintJobDto, TransactionDto } from "@/api/types";
import { ErrorMessage } from "@/components/ui";
import { PrintJobStatusBadge } from "./PrintJobStatus";
import { useCurrentTerminal } from "./useCurrentTerminal";

// Receipt printing for one transaction on this device: sends to the
// terminal's receipt printer when it has one, otherwise falls back to the
// browser print dialog (the pre-hardware behavior).
export function useReceiptPrinting(
  transaction: Pick<TransactionDto, "id" | "outletId" | "receiptPrintJob" | "receiptPrintError"> | null | undefined
) {
  const { terminal } = useCurrentTerminal(transaction?.outletId);
  const reprint = useReprintReceipt();
  const retry = useRetryPrintJob();
  const [jobId, setJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: job } = usePrintJob(jobId);

  // Track the job the sale itself queued, when the modal is showing a fresh sale.
  useEffect(() => {
    setJobId(transaction?.receiptPrintJob?.id ?? null);
    setError(transaction?.receiptPrintError ?? null);
  }, [transaction?.id, transaction?.receiptPrintJob?.id, transaction?.receiptPrintError]);

  const printer = terminal?.receiptPrinter ?? null;

  async function print() {
    if (!transaction) return;
    if (!terminal || !printer) {
      window.print();
      return;
    }
    setError(null);
    try {
      const queued = await reprint.mutateAsync({ transactionId: transaction.id, terminalId: terminal.id });
      setJobId(queued.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function retryJob() {
    if (!jobId) return;
    setError(null);
    try {
      await retry.mutateAsync(jobId);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const status = (
    <ReceiptPrintStatus
      printerName={job?.printer.name ?? transaction?.receiptPrintJob?.printer.name ?? printer?.name}
      job={job ?? transaction?.receiptPrintJob ?? null}
      tracking={!!jobId}
      error={error}
      onRetry={retryJob}
      retrying={retry.isPending}
    />
  );

  return {
    printer,
    print,
    printing: reprint.isPending,
    // Label for the main print button.
    printLabel: printer ? (jobId ? "Reprint" : `Print to ${printer.name}`) : "Print",
    status,
  };
}

function ReceiptPrintStatus({
  printerName,
  job,
  tracking,
  error,
  onRetry,
  retrying,
}: {
  printerName?: string;
  job: PrintJobDto | null;
  tracking: boolean;
  error: string | null;
  onRetry: () => void;
  retrying: boolean;
}) {
  if (error) return <ErrorMessage message={`Receipt not printed: ${error}`} />;
  if (!tracking || !job) return null;
  return (
    <div className="flex items-center justify-between gap-2 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <span className="flex items-center gap-2">
        Receipt → {printerName}
        <PrintJobStatusBadge status={job.status} />
      </span>
      {job.status === "FAILED" && (
        <span className="flex items-center gap-3">
          <span className="text-xs text-red-600 truncate max-w-[14rem]" title={job.lastError ?? undefined}>
            {job.lastError}
          </span>
          <button onClick={onRetry} disabled={retrying} className="text-brand-600 hover:underline font-medium">
            Retry
          </button>
        </span>
      )}
    </div>
  );
}
