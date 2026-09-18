import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { GoodsReceivedNoteDto } from "./types";

export function useGoodsReceivedNotes(outletId?: number) {
  return useQuery({
    queryKey: ["goods-received-notes", outletId],
    queryFn: async () =>
      (await apiClient.get<GoodsReceivedNoteDto[]>("/goods-received-notes", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useGoodsReceivedNote(id?: number) {
  return useQuery({
    queryKey: ["goods-received-note", id],
    queryFn: async () => (await apiClient.get<GoodsReceivedNoteDto>(`/goods-received-notes/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateGoodsReceivedNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      purchaseOrderId: number;
      notes?: string;
      items: { purchaseOrderItemId: number; quantityReceived: number; quantityRejected?: number; rejectionReason?: string }[];
    }) => (await apiClient.post<GoodsReceivedNoteDto>("/goods-received-notes", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goods-received-notes"] });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["purchase-order"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
    },
  });
}
