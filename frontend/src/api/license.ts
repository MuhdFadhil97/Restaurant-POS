import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export type LicenseState = "OK" | "EXPIRING_SOON" | "GRACE_PERIOD" | "RESTRICTED" | "DEV_BYPASS";

export interface LicenseStatus {
  state: LicenseState;
  restricted: boolean;
  message: string;
  daysRemaining: number | null;
  clientName: string | null;
  planTier: "BASIC" | "PRO" | null;
  maxOutlets: number | null;
  maxUsers: number | null;
  expiresAt: string | null;
}

export function useLicenseStatus() {
  return useQuery({
    queryKey: ["license-status"],
    queryFn: async () => (await apiClient.get<LicenseStatus>("/license/status")).data,
    staleTime: 60_000,
    refetchInterval: 15 * 60_000,
    retry: false,
  });
}
