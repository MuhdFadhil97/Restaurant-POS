import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { PurchaseOrderDto, PurchaseOrderStatus } from "./types";

export function usePurchaseOrders(outletId?: string, status?: PurchaseOrderStatus) {
  return useQuery({
    queryKey: ["purchase-orders", outletId, status],
    queryFn: async () =>
      (await apiClient.get<PurchaseOrderDto[]>("/purchase-orders", { params: { outletId, status } })).data,
    enabled: !!outletId,
  });
}

export function usePurchaseOrder(id?: string) {
  return useQuery({
    queryKey: ["purchase-order", id],
    queryFn: async () => (await apiClient.get<PurchaseOrderDto>(`/purchase-orders/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      outletId: string;
      supplierId: string;
      expectedAt?: string;
      notes?: string;
      items: { productId: string; variantId?: string; quantityOrdered: number; unitCost: number }[];
    }) => (await apiClient.post<PurchaseOrderDto>("/purchase-orders", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export function useMarkOrdered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<PurchaseOrderDto>(`/purchase-orders/${id}/mark-ordered`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export function useReceivePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, items }: { id: string; items: { itemId: string; quantityReceived: number }[] }) =>
      (await apiClient.post<PurchaseOrderDto>(`/purchase-orders/${id}/receive`, { items })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["purchase-order"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
    },
  });
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<PurchaseOrderDto>(`/purchase-orders/${id}/cancel`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}
