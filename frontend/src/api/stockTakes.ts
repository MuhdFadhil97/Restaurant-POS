import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { StockTakeDto } from "./types";

export function useStockTakes(outletId?: number) {
  return useQuery({
    queryKey: ["stock-takes", outletId],
    queryFn: async () => (await apiClient.get<StockTakeDto[]>("/stock-takes", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useStockTake(id?: number) {
  return useQuery({
    queryKey: ["stock-take", id],
    queryFn: async () => (await apiClient.get<StockTakeDto>(`/stock-takes/${id}`)).data,
    enabled: !!id,
  });
}

export function useStartStockTake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { outletId: number; notes?: string }) =>
      (await apiClient.post<StockTakeDto>("/stock-takes", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock-takes"] }),
  });
}

export function useSaveStockTakeCounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      items,
    }: {
      id: number;
      items: { id: number; countedQuantity: number; notes?: string }[];
    }) => (await apiClient.patch<StockTakeDto>(`/stock-takes/${id}/items`, { items })).data,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["stock-take", variables.id] });
    },
  });
}

export function useCompleteStockTake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<StockTakeDto>(`/stock-takes/${id}/complete`)).data,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["stock-takes"] });
      qc.invalidateQueries({ queryKey: ["stock-take", id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
    },
  });
}

export function useCancelStockTake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<StockTakeDto>(`/stock-takes/${id}/cancel`)).data,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["stock-takes"] });
      qc.invalidateQueries({ queryKey: ["stock-take", id] });
    },
  });
}
