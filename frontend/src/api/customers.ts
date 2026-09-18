import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { Customer, TransactionDto } from "./types";

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ["customers", search],
    queryFn: async () => (await apiClient.get<Customer[]>("/customers", { params: { search } })).data,
  });
}

export function useCustomerHistory(id?: string) {
  return useQuery({
    queryKey: ["customer-history", id],
    queryFn: async () => (await apiClient.get<TransactionDto[]>(`/customers/${id}/history`)).data,
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Customer>) => (await apiClient.post<Customer>("/customers", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Customer> & { id: string }) =>
      (await apiClient.patch<Customer>(`/customers/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
