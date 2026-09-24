import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { CustomerDisplayMode, TerminalDto } from "./types";

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
