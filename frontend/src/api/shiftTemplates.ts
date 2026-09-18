import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { StaffShiftTemplate } from "./types";

export function useShiftTemplates(outletId?: string) {
  return useQuery({
    queryKey: ["shift-templates", outletId],
    queryFn: async () =>
      (await apiClient.get<StaffShiftTemplate[]>("/shift-templates", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useCreateShiftTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<StaffShiftTemplate>) =>
      (await apiClient.post<StaffShiftTemplate>("/shift-templates", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shift-templates"] }),
  });
}

export function useUpdateShiftTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<StaffShiftTemplate> & { id: string }) =>
      (await apiClient.patch<StaffShiftTemplate>(`/shift-templates/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shift-templates"] }),
  });
}

export function useDeleteShiftTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/shift-templates/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shift-templates"] }),
  });
}
