import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { PurchaseOrderDto, PurchaseOrderStatus } from "./types";

export interface PurchaseOrderItemInput {
  productId: number;
  variantId?: number;
  quantityOrdered: number;
  unitCost: number;
  taxRateId?: number;
  discountAmount?: number;
}

export function usePurchaseOrders(outletId?: number, status?: PurchaseOrderStatus) {
  return useQuery({
    queryKey: ["purchase-orders", outletId, status],
    queryFn: async () =>
      (await apiClient.get<PurchaseOrderDto[]>("/purchase-orders", { params: { outletId, status } })).data,
    enabled: !!outletId,
  });
}

export function usePurchaseOrder(id?: number) {
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
      outletId: number;
      supplierId: number;
      expectedAt?: string;
      notes?: string;
      items: PurchaseOrderItemInput[];
    }) => (await apiClient.post<PurchaseOrderDto>("/purchase-orders", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      input: {
        supplierId?: number;
        expectedAt?: string | null;
        notes?: string;
        items?: PurchaseOrderItemInput[];
      };
    }) => (await apiClient.patch<PurchaseOrderDto>(`/purchase-orders/${id}`, input)).data,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["purchase-order", variables.id] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/purchase-orders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

function invalidatePoQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["purchase-orders"] });
  qc.invalidateQueries({ queryKey: ["purchase-order"] });
}

export function useSubmitForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.post<PurchaseOrderDto>(`/purchase-orders/${id}/submit-for-approval`)).data,
    onSuccess: () => invalidatePoQueries(qc),
  });
}

export function useApprovePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<PurchaseOrderDto>(`/purchase-orders/${id}/approve`)).data,
    onSuccess: () => invalidatePoQueries(qc),
  });
}

export function useRejectPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      (await apiClient.post<PurchaseOrderDto>(`/purchase-orders/${id}/reject`, { reason })).data,
    onSuccess: () => invalidatePoQueries(qc),
  });
}

export function useMarkOrdered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<PurchaseOrderDto>(`/purchase-orders/${id}/mark-ordered`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<PurchaseOrderDto>(`/purchase-orders/${id}/cancel`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export async function downloadPurchaseOrderPdf(id: number, poNumber: string) {
  const response = await apiClient.get(`/purchase-orders/${id}/pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${poNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
