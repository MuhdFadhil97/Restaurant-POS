import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { Outlet } from "./types";

export function useOutlets() {
  return useQuery({
    queryKey: ["outlets"],
    queryFn: async () => (await apiClient.get<Outlet[]>("/outlets")).data,
  });
}

export function useCreateOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Outlet>) => (await apiClient.post<Outlet>("/outlets", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outlets"] }),
  });
}

export function useUpdateOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<Outlet> }) =>
      (await apiClient.patch<Outlet>(`/outlets/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outlets"] }),
  });
}
