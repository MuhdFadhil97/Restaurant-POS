import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export type AccountingExportFormat = "QUICKBOOKS_CSV" | "XERO_CSV" | "GENERIC_CSV";
export type AccountingExportStatus = "COMPLETED" | "FAILED";

export interface AccountingExportRun {
  id: number;
  outletId: number;
  format: AccountingExportFormat;
  status: AccountingExportStatus;
  periodStart: string;
  periodEnd: string;
  rowCount: number;
  errorMessage?: string | null;
  createdAt: string;
  requestedBy: { id: number; name: string };
}

export interface CreateRunInput {
  outletId: number;
  format: AccountingExportFormat;
  periodStart: string;
  periodEnd: string;
}

export function useAccountingExportRuns(outletId: number | undefined) {
  return useQuery({
    queryKey: ["accounting-export-runs", outletId],
    queryFn: async () => (await apiClient.get<AccountingExportRun[]>("/accounting-export/runs", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useCreateAccountingExportRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRunInput) => (await apiClient.post<AccountingExportRun>("/accounting-export/runs", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting-export-runs"] }),
  });
}

export async function downloadAccountingExportRun(run: AccountingExportRun): Promise<void> {
  const res = await apiClient.get(`/accounting-export/runs/${run.id}/download`, { responseType: "blob" });
  const contentDisposition = res.headers["content-disposition"] as string | undefined;
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `accounting-export-${run.id}.csv`;

  const url = URL.createObjectURL(res.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
