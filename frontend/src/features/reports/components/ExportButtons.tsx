import { useState } from "react";
import { Button } from "@/components/ui";
import { downloadReport, ReportQueryParams } from "@/api/reports";
import { getErrorMessage } from "@/api/client";

export function ExportButtons({ reportKey, params }: { reportKey: string; params: ReportQueryParams }) {
  const [pending, setPending] = useState<"xlsx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (format: "xlsx" | "pdf") => {
    setPending(format);
    setError(null);
    try {
      await downloadReport(reportKey, format, params);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button variant="secondary" className="text-xs px-3 py-1.5" disabled={pending !== null} onClick={() => handleDownload("xlsx")}>
          {pending === "xlsx" ? "Exporting..." : "Excel"}
        </Button>
        <Button variant="secondary" className="text-xs px-3 py-1.5" disabled={pending !== null} onClick={() => handleDownload("pdf")}>
          {pending === "pdf" ? "Exporting..." : "PDF"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
