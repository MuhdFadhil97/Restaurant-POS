import { PrintJobStatus as Status } from "@/api/types";
import { Badge } from "@/components/ui";

const colors: Record<Status, "gray" | "blue" | "green" | "red"> = {
  PENDING: "gray",
  CLAIMED: "blue",
  PRINTED: "green",
  FAILED: "red",
};

const labels: Record<Status, string> = {
  PENDING: "Queued",
  CLAIMED: "Printing",
  PRINTED: "Printed",
  FAILED: "Failed",
};

export function PrintJobStatusBadge({ status }: { status: Status }) {
  return <Badge color={colors[status]}>{labels[status]}</Badge>;
}

// "OK" or the last error message, as stored on Printer.lastStatus.
export function PrinterHealthDot({ lastStatus }: { lastStatus: string | null }) {
  const color = lastStatus == null ? "bg-gray-300" : lastStatus === "OK" ? "bg-green-500" : "bg-red-500";
  const title = lastStatus == null ? "Not used yet" : lastStatus === "OK" ? "Last print succeeded" : lastStatus;
  return <span title={title} className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}
