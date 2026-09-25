import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { Reservation, ReservationStatus } from "./types";

export interface ReservationListParams {
  outletId: number;
  dateFrom?: string;
  dateTo?: string;
  status?: ReservationStatus;
}

export function useReservations(params: ReservationListParams) {
  return useQuery({
    queryKey: ["reservations", params],
    queryFn: async () => (await apiClient.get<Reservation[]>("/reservations", { params })).data,
    enabled: !!params.outletId,
  });
}

export interface CreateReservationInput {
  outletId: number;
  tableId?: number;
  customerName: string;
  phone?: string;
  partySize: number;
  reservedFor: string;
  durationMinutes?: number;
  depositAmount?: number;
  notes?: string;
}

function useInvalidateReservations() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["reservations"] });
}

export function useCreateReservation() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: async (input: CreateReservationInput) =>
      (await apiClient.post<Reservation>("/reservations", input)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateReservation() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateReservationInput> & { id: number }) =>
      (await apiClient.patch<Reservation>(`/reservations/${id}`, input)).data,
    onSuccess: invalidate,
  });
}

export function useConfirmReservation() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: async ({ id, tableId }: { id: number; tableId?: number }) =>
      (await apiClient.post<Reservation>(`/reservations/${id}/confirm`, { tableId })).data,
    onSuccess: invalidate,
  });
}

export function useSeatReservation() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: async ({ id, tableId }: { id: number; tableId?: number }) =>
      (await apiClient.post<Reservation>(`/reservations/${id}/seat`, { tableId })).data,
    onSuccess: invalidate,
  });
}

export function useCompleteReservation() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<Reservation>(`/reservations/${id}/complete`)).data,
    onSuccess: invalidate,
  });
}

export function useCancelReservation() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) =>
      (await apiClient.post<Reservation>(`/reservations/${id}/cancel`, { reason })).data,
    onSuccess: invalidate,
  });
}

export function useMarkNoShow() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<Reservation>(`/reservations/${id}/no-show`)).data,
    onSuccess: invalidate,
  });
}

export function useCollectDeposit() {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) =>
      (await apiClient.post<Reservation>(`/reservations/${id}/deposit`, { amount })).data,
    onSuccess: invalidate,
  });
}

export interface PublicReservationInput {
  customerName: string;
  phone: string;
  partySize: number;
  reservedFor: string;
  notes?: string;
}

export function useCreatePublicReservation(outletId: number) {
  return useMutation({
    mutationFn: async (input: PublicReservationInput) =>
      (await apiClient.post<Reservation>(`/public/reservations/${outletId}`, input)).data,
  });
}
