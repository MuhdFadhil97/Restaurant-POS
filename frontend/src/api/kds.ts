import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { PrepStatus, TableDto, TransactionItemDto, TransactionOrigin } from "./types";

export interface KdsQueueItem extends TransactionItemDto {
  transaction: { id: number; table: TableDto | null; origin: TransactionOrigin };
}

export function useKdsQueue(outletId?: number, stationId?: number) {
  return useQuery({
    queryKey: ["kds-queue", outletId, stationId],
    queryFn: async () =>
      (await apiClient.get<KdsQueueItem[]>("/kds/queue", { params: { outletId, stationId } })).data,
    enabled: !!outletId,
    refetchInterval: 5_000,
  });
}

export function useUpdatePrepStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, prepStatus }: { itemId: number; prepStatus: PrepStatus }) =>
      (await apiClient.patch<TransactionItemDto>(`/kds/items/${itemId}`, { prepStatus })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kds-queue"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["transaction"] });
    },
  });
}
