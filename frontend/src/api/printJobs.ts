import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { PrintJobDto, PrintJobStatus } from "./types";

export function usePrintJobs(outletId?: number, status?: PrintJobStatus) {
  return useQuery({
    queryKey: ["print-jobs", outletId, status],
    queryFn: async () =>
      (await apiClient.get<PrintJobDto[]>("/print-jobs", { params: { outletId, status } })).data,
    enabled: !!outletId,
    refetchInterval: 5_000,
  });
}

// Polls a single job until it reaches a final state (PRINTED/FAILED).
export function usePrintJob(id?: number | null) {
  return useQuery({
    queryKey: ["print-jobs", "detail", id],
    queryFn: async () => (await apiClient.get<PrintJobDto>(`/print-jobs/${id}`)).data,
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PRINTED" || status === "FAILED" ? false : 1_500;
    },
  });
}

export function useRetryPrintJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<PrintJobDto>(`/print-jobs/${id}/retry`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["print-jobs"] }),
  });
}
