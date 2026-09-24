import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface PrintBridgeDto {
  id: number;
  outletId: number;
  name: string;
  lastSeenAt: string | null;
  createdAt: string;
}

// Only present in the create/regenerate response — the one moment the
// plaintext token is ever available.
export interface PrintBridgeWithToken extends PrintBridgeDto {
  token: string;
}

export function usePrintBridges(outletId?: number) {
  return useQuery({
    queryKey: ["print-bridges", outletId],
    queryFn: async () => (await apiClient.get<PrintBridgeDto[]>("/print-bridges", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useCreatePrintBridge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { outletId: number; name: string }) =>
      (await apiClient.post<PrintBridgeWithToken>("/print-bridges", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["print-bridges"] }),
  });
}

export function useUpdatePrintBridge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) =>
      (await apiClient.patch<PrintBridgeDto>(`/print-bridges/${id}`, { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["print-bridges"] }),
  });
}

export function useDeletePrintBridge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/print-bridges/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["print-bridges"] });
      qc.invalidateQueries({ queryKey: ["printers"] });
    },
  });
}

export function useRegeneratePrintBridgeToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.post<PrintBridgeWithToken>(`/print-bridges/${id}/regenerate-token`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["print-bridges"] }),
  });
}
