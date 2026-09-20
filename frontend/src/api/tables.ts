import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { TableDto, TableShape } from "./types";

export function useTables(outletId?: number) {
  return useQuery({
    queryKey: ["tables", outletId],
    queryFn: async () => (await apiClient.get<TableDto[]>("/tables", { params: { outletId } })).data,
    enabled: !!outletId,
    refetchInterval: 15_000,
  });
}

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { outletId: number; name: string; capacity: number }) =>
      (await apiClient.post<TableDto>("/tables", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tables"] }),
  });
}

export function useUpdateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      input: {
        name?: string;
        capacity?: number;
        status?: TableDto["status"];
        reservedFor?: string | null;
        reservedAt?: string | null;
        reservedPartySize?: number | null;
      };
    }) => (await apiClient.patch<TableDto>(`/tables/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tables"] }),
  });
}

export function useDeleteTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/tables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tables"] }),
  });
}

export function useRegenerateTableQr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<TableDto>(`/tables/${id}/qr-token`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tables"] }),
  });
}

export function useSaveTableLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      outletId: number;
      tables: { id: number; posX: number; posY: number; shape?: TableShape; width?: number; height?: number }[];
    }) => (await apiClient.patch<TableDto[]>("/tables/layout", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tables"] }),
  });
}
