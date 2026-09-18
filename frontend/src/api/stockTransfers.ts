import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { StockTransferDto } from "./types";

export function useStockTransfers(outletId?: string) {
  return useQuery({
    queryKey: ["stock-transfers", outletId],
    queryFn: async () => (await apiClient.get<StockTransferDto[]>("/stock-transfers", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useCreateStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      fromOutletId: string;
      toOutletId: string;
      notes?: string;
      items: { productId: string; variantId?: string; quantity: number }[];
    }) => (await apiClient.post<StockTransferDto>("/stock-transfers", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock-transfers"] }),
  });
}

export function useSendStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<StockTransferDto>(`/stock-transfers/${id}/send`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-transfers"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useReceiveStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<StockTransferDto>(`/stock-transfers/${id}/receive`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-transfers"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCancelStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<StockTransferDto>(`/stock-transfers/${id}/cancel`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock-transfers"] }),
  });
}
