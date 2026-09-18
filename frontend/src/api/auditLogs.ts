import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import { AuditLogEntry } from "./types";

export function useAuditLogs(filters: { outletId?: string; userId?: string; action?: string }) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => (await apiClient.get<AuditLogEntry[]>("/audit-logs", { params: filters })).data,
  });
}
