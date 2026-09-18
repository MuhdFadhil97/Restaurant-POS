import { Card, Spinner } from "@/components/ui";
import { useReport, ReportQueryParams } from "@/api/reports";
import { ExportButtons } from "./ExportButtons";
import { GenericReportTable } from "./GenericReportTable";

export function ReportCard({
  reportKey,
  params,
  titleOverride,
  enabled = true,
}: {
  reportKey: string;
  params: ReportQueryParams;
  titleOverride?: string;
  enabled?: boolean;
}) {
  const { data, isLoading, isError } = useReport(reportKey, params, enabled);
  const isWide = (data?.columns?.length ?? 0) >= 5;

  return (
    <Card className={`p-4 ${isWide ? "lg:col-span-2" : ""}`}>
      <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
        <h2 className="font-semibold">{titleOverride ?? data?.title ?? "Report"}</h2>
        <ExportButtons reportKey={reportKey} params={params} />
      </div>
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <p className="text-sm text-red-600">Failed to load this report.</p>
      ) : (
        <GenericReportTable columns={data?.columns ?? []} rows={(data?.rows as Record<string, unknown>[]) ?? []} />
      )}
    </Card>
  );
}
