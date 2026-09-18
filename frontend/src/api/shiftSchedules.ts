import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { StaffShiftSchedule } from "./types";

export function useOutletStaff(outletId?: number) {
  return useQuery({
    queryKey: ["shift-schedule-staff", outletId],
    queryFn: async () =>
      (
        await apiClient.get<{ id: number; name: string; role: string }[]>("/shift-schedules/staff", {
          params: { outletId },
        })
      ).data,
    enabled: !!outletId,
  });
}

export function useShiftSchedulesForMonth(outletId?: number, month?: string) {
  return useQuery({
    queryKey: ["shift-schedules", outletId, month],
    queryFn: async () =>
      (await apiClient.get<StaffShiftSchedule[]>("/shift-schedules", { params: { outletId, month } })).data,
    enabled: !!outletId && !!month,
  });
}

export function useMyShiftSchedules(from?: string, to?: string) {
  return useQuery({
    queryKey: ["shift-schedules-mine", from, to],
    queryFn: async () =>
      (await apiClient.get<StaffShiftSchedule[]>("/shift-schedules/mine", { params: { from, to } })).data,
    enabled: !!from && !!to,
  });
}

export function useCreateShiftSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { outletId: number; userId: number; shiftTemplateId: number; date: string; notes?: string }) =>
      (
        await apiClient.post<{ schedule: StaffShiftSchedule; overlapWarning: string | null }>(
          "/shift-schedules",
          input
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shift-schedules"] }),
  });
}

export function useUpdateShiftSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: number; shiftTemplateId?: number; notes?: string }) =>
      (await apiClient.patch<StaffShiftSchedule>(`/shift-schedules/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shift-schedules"] }),
  });
}

export function useDeleteShiftSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/shift-schedules/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shift-schedules"] }),
  });
}
