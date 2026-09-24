import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { PaymentMethod, TransactionDto, TransactionStatus } from "./types";

export interface TransactionListFilters {
  outletId?: number;
  cashierId?: number;
  status?: TransactionStatus;
  paymentMethod?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
}

export function useTransactions(filters: TransactionListFilters) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () => (await apiClient.get<TransactionDto[]>("/transactions", { params: filters })).data,
    enabled: !!filters.outletId,
  });
}

export function useHeldTransactions(outletId?: number) {
  return useTransactions({ outletId, status: "HELD" });
}

export function useTransaction(id?: number) {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: async () => (await apiClient.get<TransactionDto>(`/transactions/${id}`)).data,
    enabled: !!id,
  });
}

interface DraftInput {
  outletId: number;
  tableId?: number;
  customerId?: number;
  orderDiscountId?: number;
  notes?: string;
  items?: { productId: number; variantId?: number; quantity: number; discountId?: number }[];
}

export function useCreateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DraftInput) => (await apiClient.post<TransactionDto>("/transactions", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}

export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      transactionId,
      ...input
    }: {
      transactionId: number;
      productId: number;
      variantId?: number;
      quantity: number;
      discountId?: number;
    }) => (await apiClient.post<TransactionDto>(`/transactions/${transactionId}/items`, input)).data,
    onSuccess: (data) => {
      qc.setQueryData(["transaction", data.id], data);
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      transactionId,
      itemId,
      quantity,
      discountId,
    }: {
      transactionId: number;
      itemId: number;
      quantity?: number;
      discountId?: number | null;
    }) =>
      (
        await apiClient.patch<TransactionDto>(`/transactions/${transactionId}/items/${itemId}`, {
          quantity,
          discountId,
        })
      ).data,
    onSuccess: (data) => {
      qc.setQueryData(["transaction", data.id], data);
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useRemoveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId, itemId }: { transactionId: number; itemId: number }) =>
      (await apiClient.delete<TransactionDto>(`/transactions/${transactionId}/items/${itemId}`)).data,
    onSuccess: (data) => {
      qc.setQueryData(["transaction", data.id], data);
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      input: { customerId?: number | null; tableId?: number | null; orderDiscountId?: number | null; notes?: string };
    }) => (await apiClient.patch<TransactionDto>(`/transactions/${id}`, input)).data,
    onSuccess: (data) => {
      qc.setQueryData(["transaction", data.id], data);
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useFinalizeTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payments,
      terminalId,
    }: {
      id: number;
      payments: { method: PaymentMethod; amount: number; reference?: string }[];
      terminalId?: number;
    }) => (await apiClient.post<TransactionDto>(`/transactions/${id}/finalize`, { payments, terminalId })).data,
    onSuccess: (data) => {
      qc.setQueryData(["transaction", data.id], data);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: DraftInput & {
        payments: { method: PaymentMethod; amount: number; reference?: string }[];
        terminalId?: number;
      }
    ) => (await apiClient.post<TransactionDto>("/transactions/checkout", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useVoidTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      approverId,
      approverPassword,
    }: {
      id: number;
      reason: string;
      approverId?: number;
      approverPassword?: string;
    }) =>
      (await apiClient.post<TransactionDto>(`/transactions/${id}/void`, { reason, approverId, approverPassword }))
        .data,
    onSuccess: (data) => {
      qc.setQueryData(["transaction", data.id], data);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}

export function useRefundTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      approverId,
      approverPassword,
    }: {
      id: number;
      reason: string;
      approverId?: number;
      approverPassword?: string;
    }) =>
      (await apiClient.post<TransactionDto>(`/transactions/${id}/refund`, { reason, approverId, approverPassword }))
        .data,
    onSuccess: (data) => {
      qc.setQueryData(["transaction", data.id], data);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}
