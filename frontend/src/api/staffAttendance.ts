import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { StaffAttendance, WeeklyComplianceSummary } from "./types";

export function useCurrentAttendance() {
  return useQuery({
    queryKey: ["staff-attendance-current"],
    queryFn: async () => (await apiClient.get<StaffAttendance | null>("/staff-attendance/current")).data,
    refetchInterval: 30_000,
  });
}

export function useMyAttendanceHistory(from?: string, to?: string) {
  return useQuery({
    queryKey: ["staff-attendance-mine", from, to],
    queryFn: async () =>
      (await apiClient.get<StaffAttendance[]>("/staff-attendance/mine", { params: { from, to } })).data,
    enabled: !!from && !!to,
  });
}

export function useAttendanceReport(outletId?: number, from?: string, to?: string) {
  return useQuery({
    queryKey: ["staff-attendance", outletId, from, to],
    queryFn: async () =>
      (
        await apiClient.get<{ records: StaffAttendance[]; weeklyCompliance: WeeklyComplianceSummary[] }>(
          "/staff-attendance",
          { params: { outletId, from, to } }
        )
      ).data,
    enabled: !!outletId && !!from && !!to,
  });
}

function invalidateAttendance(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["staff-attendance-current"] });
  qc.invalidateQueries({ queryKey: ["staff-attendance-mine"] });
  qc.invalidateQueries({ queryKey: ["staff-attendance"] });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { outletId: number; scheduleId?: number }) =>
      (await apiClient.post<StaffAttendance>("/staff-attendance/clock-in", input)).data,
    onSuccess: () => invalidateAttendance(qc),
  });
}

export function useStartBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<StaffAttendance>("/staff-attendance/break/start")).data,
    onSuccess: () => invalidateAttendance(qc),
  });
}

export function useEndBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<StaffAttendance>("/staff-attendance/break/end")).data,
    onSuccess: () => invalidateAttendance(qc),
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<StaffAttendance>("/staff-attendance/clock-out")).data,
    onSuccess: () => invalidateAttendance(qc),
  });
}

export function useCorrectAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: number; clockInAt?: string; clockOutAt?: string | null }) =>
      (await apiClient.patch<StaffAttendance>(`/staff-attendance/${id}`, input)).data,
    onSuccess: () => invalidateAttendance(qc),
  });
}
