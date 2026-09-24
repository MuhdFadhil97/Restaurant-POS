import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { CustomerDisplayMode, PrintJobDto, TerminalDto } from "./types";

export interface TerminalInput {
  name?: string;
  receiptPrinterId?: number | null;
  cashDrawerEnabled?: boolean;
  customerDisplayMode?: CustomerDisplayMode;
  isActive?: boolean;
}

export function useTerminals(outletId?: number) {
  return useQuery({
    queryKey: ["terminals", outletId],
    queryFn: async () => (await apiClient.get<TerminalDto[]>("/terminals", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useTerminal(id?: number | null) {
  return useQuery({
    queryKey: ["terminals", "detail", id],
    queryFn: async () => (await apiClient.get<TerminalDto>(`/terminals/${id}`)).data,
    enabled: !!id,
    retry: false,
    // Keeps the receipt printer's health (lastStatus) fresh on the POS screen.
    refetchInterval: 15_000,
  });
}

export function useCreateTerminal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TerminalInput & { outletId: number; name: string }) =>
      (await apiClient.post<TerminalDto>("/terminals", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["terminals"] }),
  });
}

export function useUpdateTerminal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: TerminalInput }) =>
      (await apiClient.patch<TerminalDto>(`/terminals/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["terminals"] }),
  });
}

export function useDeleteTerminal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/terminals/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["terminals"] }),
  });
}

export function useRegenerateDisplayToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.post<TerminalDto>(`/terminals/${id}/regenerate-display-token`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["terminals"] }),
  });
}

export async function sendTerminalHeartbeat(id: number) {
  return (await apiClient.post<TerminalDto>(`/terminals/${id}/heartbeat`)).data;
}

// "No sale" drawer open — audited server-side.
export function useOpenDrawer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ terminalId, reason }: { terminalId: number; reason?: string }) =>
      (await apiClient.post<PrintJobDto>(`/terminals/${terminalId}/drawer`, { reason })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["print-jobs"] }),
  });
}
