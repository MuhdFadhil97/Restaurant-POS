import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { CashSession } from "./types";

export function useCurrentCashSession(outletId?: number) {
  return useQuery({
    queryKey: ["cash-session-current", outletId],
    queryFn: async () =>
      (await apiClient.get<CashSession | null>("/cash-sessions/current", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useCashSessions(outletId?: number) {
  return useQuery({
    queryKey: ["cash-sessions", outletId],
    queryFn: async () => (await apiClient.get<CashSession[]>("/cash-sessions", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useOpenCashSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { outletId: number; openingCash: number; terminalId?: number }) =>
      (await apiClient.post<CashSession>("/cash-sessions", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cash-session-current"] }),
  });
}

export function useCloseCashSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actualCash }: { id: number; actualCash: number }) =>
      (await apiClient.post<CashSession>(`/cash-sessions/${id}/close`, { actualCash })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-session-current"] });
      qc.invalidateQueries({ queryKey: ["cash-sessions"] });
    },
  });
}
