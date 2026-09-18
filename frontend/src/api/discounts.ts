import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { Discount } from "./types";

export function useDiscounts() {
  return useQuery({
    queryKey: ["discounts"],
    queryFn: async () => (await apiClient.get<Discount[]>("/discounts")).data,
  });
}

export function useCreateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Discount>) => (await apiClient.post<Discount>("/discounts", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useUpdateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<Discount> }) =>
      (await apiClient.patch<Discount>(`/discounts/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useDeleteDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/discounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
  });
}
