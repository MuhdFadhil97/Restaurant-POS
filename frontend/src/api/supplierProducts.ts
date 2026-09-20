import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { SupplierPriceHistoryEntry, SupplierProductDto } from "./types";

export interface SupplierProductInput {
  supplierId: number;
  productId: number;
  variantId?: number;
  supplierSku?: string;
  unitCost: number;
  leadTimeDays?: number;
  isPreferred?: boolean;
}

export function useSupplierProducts(supplierId?: number) {
  return useQuery({
    queryKey: ["supplier-products", supplierId],
    queryFn: async () =>
      (await apiClient.get<SupplierProductDto[]>("/supplier-products", { params: { supplierId } })).data,
    enabled: !!supplierId,
  });
}

export function useCreateSupplierProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SupplierProductInput) =>
      (await apiClient.post<SupplierProductDto>("/supplier-products", input)).data,
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["supplier-products", data.supplierId] }),
  });
}

export function useUpdateSupplierProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<SupplierProductInput> }) =>
      (await apiClient.patch<SupplierProductDto>(`/supplier-products/${id}`, input)).data,
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["supplier-products", data.supplierId] }),
  });
}

export function useDeleteSupplierProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number; supplierId: number }) => apiClient.delete(`/supplier-products/${id}`),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ["supplier-products", variables.supplierId] }),
  });
}

export function useSupplierPriceHistory(supplierId?: number, productId?: number) {
  return useQuery({
    queryKey: ["supplier-price-history", supplierId, productId],
    queryFn: async () =>
      (
        await apiClient.get<SupplierPriceHistoryEntry[]>("/supplier-products/price-history", {
          params: { supplierId, productId },
        })
      ).data,
    enabled: !!supplierId && !!productId,
  });
}
