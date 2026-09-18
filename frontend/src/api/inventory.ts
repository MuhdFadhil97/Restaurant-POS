import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { InventoryMovement, ProductStock } from "./types";

export function useLowStock(outletId?: string) {
  return useQuery({
    queryKey: ["low-stock", outletId],
    queryFn: async () =>
      (
        await apiClient.get<(ProductStock & { product: { name: string; lowStockThreshold: number } })[]>(
          "/inventory/low-stock",
          { params: { outletId } }
        )
      ).data,
    enabled: !!outletId,
    refetchInterval: 60_000,
  });
}

export function useInventoryMovements(outletId?: string, productId?: string) {
  return useQuery({
    queryKey: ["movements", outletId, productId],
    queryFn: async () =>
      (await apiClient.get<InventoryMovement[]>("/inventory/movements", { params: { outletId, productId } })).data,
    enabled: !!outletId,
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      outletId: string;
      productId: string;
      variantId?: string;
      type: "RESTOCK" | "WASTAGE" | "CORRECTION";
      quantityChange: number;
      reason?: string;
    }) => (await apiClient.post("/inventory/adjustments", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
