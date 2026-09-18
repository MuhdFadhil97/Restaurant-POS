import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { GiftCard } from "./types";

export function useGiftCards() {
  return useQuery({
    queryKey: ["gift-cards"],
    queryFn: async () => (await apiClient.get<GiftCard[]>("/gift-cards")).data,
  });
}

export function useCreateGiftCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { code?: string; balance: number; expiresAt?: string }) =>
      (await apiClient.post<GiftCard>("/gift-cards", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gift-cards"] }),
  });
}

// The backend has no DELETE route for gift cards (they can carry real
// balance and are referenced by past Payments, so hard-deleting one isn't
// safe) — "deleting" one just means deactivating it via this same PATCH.
export function useUpdateGiftCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: { isActive?: boolean; balance?: number } }) =>
      (await apiClient.patch<GiftCard>(`/gift-cards/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gift-cards"] }),
  });
}

export async function lookupGiftCard(code: string): Promise<GiftCard> {
  const { data } = await apiClient.get<GiftCard>("/gift-cards/lookup", { params: { code } });
  return data;
}
