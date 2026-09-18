import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { TaxRate } from "./types";

export function useTaxRates(outletId?: string) {
  return useQuery({
    queryKey: ["tax-rates", outletId],
    queryFn: async () => (await apiClient.get<TaxRate[]>("/tax-rates", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useCreateTaxRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<TaxRate>) => (await apiClient.post<TaxRate>("/tax-rates", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tax-rates"] }),
  });
}
