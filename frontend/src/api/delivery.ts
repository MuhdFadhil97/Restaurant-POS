import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { DeliveryOrder, DeliveryOrderStatus, DeliveryPlatform, DeliveryProvider } from "./types";

// ── Platforms (credentials) ─────────────────────────────────────────────

export function useDeliveryPlatforms(outletId: number) {
  return useQuery({
    queryKey: ["delivery-platforms", outletId],
    queryFn: async () => (await apiClient.get<DeliveryPlatform[]>("/delivery-platforms", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export interface CreatePlatformInput {
  outletId: number;
  provider: DeliveryProvider;
  name: string;
  apiKey?: string;
  webhookSecret?: string;
  autoAccept?: boolean;
}

function useInvalidatePlatforms() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["delivery-platforms"] });
}

export function useCreateDeliveryPlatform() {
  const invalidate = useInvalidatePlatforms();
  return useMutation({
    mutationFn: async (input: CreatePlatformInput) =>
      (await apiClient.post<DeliveryPlatform>("/delivery-platforms", input)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateDeliveryPlatform() {
  const invalidate = useInvalidatePlatforms();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreatePlatformInput> & { id: number; isActive?: boolean }) =>
      (await apiClient.patch<DeliveryPlatform>(`/delivery-platforms/${id}`, input)).data,
    onSuccess: invalidate,
  });
}

export function useDeleteDeliveryPlatform() {
  const invalidate = useInvalidatePlatforms();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/delivery-platforms/${id}`),
    onSuccess: invalidate,
  });
}

// ── Orders (Kanban) ──────────────────────────────────────────────────────

export function useDeliveryOrders(outletId: number, status?: DeliveryOrderStatus) {
  return useQuery({
    queryKey: ["delivery-orders", outletId, status],
    queryFn: async () =>
      (await apiClient.get<DeliveryOrder[]>("/delivery-orders", { params: { outletId, status } })).data,
    enabled: !!outletId,
    // No WebSocket push (same tradeoff as KDS) — poll for new incoming orders.
    refetchInterval: 5000,
  });
}

function useInvalidateOrders() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["delivery-orders"] });
}

export function useAcceptDeliveryOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<DeliveryOrder>(`/delivery-orders/${id}/accept`)).data,
    onSuccess: invalidate,
  });
}

export function useRejectDeliveryOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      (await apiClient.post<DeliveryOrder>(`/delivery-orders/${id}/reject`, { reason })).data,
    onSuccess: invalidate,
  });
}

export function useUpdateDeliveryOrderStatus() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "READY" | "PICKED_UP" }) =>
      (await apiClient.patch<DeliveryOrder>(`/delivery-orders/${id}/status`, { status })).data,
    onSuccess: invalidate,
  });
}

export function useArchiveDeliveryOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<DeliveryOrder>(`/delivery-orders/${id}/archive`)).data,
    onSuccess: invalidate,
  });
}
