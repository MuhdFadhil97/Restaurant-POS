import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { KitchenStation } from "./types";

export function useKitchenStations(outletId?: number) {
  return useQuery({
    queryKey: ["kitchen-stations", outletId],
    queryFn: async () => (await apiClient.get<KitchenStation[]>("/kitchen-stations", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useCreateKitchenStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { outletId: number; name: string; printerId?: number | null }) =>
      (await apiClient.post<KitchenStation>("/kitchen-stations", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kitchen-stations"] }),
  });
}

export function useUpdateKitchenStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: { name?: string; printerId?: number | null } }) =>
      (await apiClient.patch<KitchenStation>(`/kitchen-stations/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kitchen-stations"] }),
  });
}

export function useDeleteKitchenStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/kitchen-stations/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kitchen-stations"] }),
  });
}
