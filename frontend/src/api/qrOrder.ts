import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { QrMenuResponse, QrOrderStatusResponse } from "./types";

export function useQrMenu(token: string) {
  return useQuery({
    queryKey: ["qr-menu", token],
    queryFn: async () => (await apiClient.get<QrMenuResponse>(`/qr-order/${token}`)).data,
    enabled: !!token,
  });
}

export function useQrOrderStatus(token: string, enabled: boolean) {
  return useQuery({
    queryKey: ["qr-order-status", token],
    queryFn: async () => (await apiClient.get<QrOrderStatusResponse>(`/qr-order/${token}/status`)).data,
    enabled: enabled && !!token,
    refetchInterval: 5_000,
  });
}

export function useSubmitQrOrder(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { productId: number; variantId?: number; quantity: number }[]) =>
      (await apiClient.post<QrOrderStatusResponse>(`/qr-order/${token}/items`, { items })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qr-order-status", token] }),
  });
}
