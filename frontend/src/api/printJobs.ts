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

export function useReprintReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { transactionId: number; terminalId: number }) =>
      (await apiClient.post<PrintJobDto>("/print-jobs/receipt", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["print-jobs"] }),
  });
}

// ── Terminal-local (USB/Bluetooth) ─────────────────────────────────────────
// Plain functions, not query hooks: useLocalPrintAgent calls these from an
// imperative polling loop (claiming has a side effect — it changes the job's
// status — so it doesn't fit TanStack Query's cache-a-GET model).

export interface LocalPrintJob {
  id: number;
  kind: string;
  printerId: number;
  payload: string; // base64
}

export async function claimLocalPrintJobs(terminalId: number): Promise<LocalPrintJob[]> {
  return (await apiClient.get<LocalPrintJob[]>(`/print-jobs/terminal/${terminalId}`)).data;
}

export async function ackLocalPrintJob(jobId: number, result: { ok: true } | { ok: false; error: string }): Promise<void> {
  await apiClient.post(`/print-jobs/${jobId}/ack`, result);
}

export interface KitchenSendResult {
  tickets: { stationName: string; printerName: string; jobId: number; itemCount: number }[];
  unroutedCount: number;
}

export function useSendToKitchen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transactionId: number) =>
      (await apiClient.post<KitchenSendResult>("/print-jobs/kitchen", { transactionId })).data,
    onSuccess: (_data, transactionId) => {
      qc.invalidateQueries({ queryKey: ["transaction", transactionId] });
      qc.invalidateQueries({ queryKey: ["print-jobs"] });
    },
  });
}
