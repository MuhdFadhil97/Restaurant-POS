import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { UserDto } from "./types";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiClient.get<UserDto[]>("/users")).data,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => (await apiClient.post<UserDto>("/users", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Record<string, unknown> }) =>
      (await apiClient.patch<UserDto>(`/users/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
