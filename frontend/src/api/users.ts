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

// Force-logout: invalidates every session already issued to this user, so
// e.g. a lost device or an access change takes effect immediately instead
// of waiting for their current token to expire.
export function useRevokeUserSessions() {
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post(`/users/${id}/revoke-sessions`)).data,
  });
}

// Sends (or resends) a set/reset-password link — the same flow a new
// invited user gets, or a self-service "forgot password" request.
export function useSendPasswordResetLink() {
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post(`/users/${id}/send-password-reset`)).data,
  });
}
