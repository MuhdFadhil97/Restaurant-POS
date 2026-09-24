import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { PrintJobDto, PrinterConnection, PrinterDto } from "./types";

export interface PrinterInput {
  name?: string;
  connection?: PrinterConnection;
  host?: string | null;
  port?: number;
  bridgeId?: number | null;
  terminalId?: number | null;
  paperWidth?: 58 | 80;
  charsPerLine?: number;
  isActive?: boolean;
}

export function usePrinters(outletId?: number) {
  return useQuery({
    queryKey: ["printers", outletId],
    queryFn: async () => (await apiClient.get<PrinterDto[]>("/printers", { params: { outletId } })).data,
    enabled: !!outletId,
  });
}

export function useCreatePrinter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PrinterInput & { outletId: number; name: string; connection: PrinterConnection }) =>
      (await apiClient.post<PrinterDto>("/printers", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["printers"] }),
  });
}

export function useUpdatePrinter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: PrinterInput }) =>
      (await apiClient.patch<PrinterDto>(`/printers/${id}`, input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["printers"] });
      qc.invalidateQueries({ queryKey: ["terminals"] });
    },
  });
}

export function useDeletePrinter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/printers/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["printers"] });
      qc.invalidateQueries({ queryKey: ["terminals"] });
      qc.invalidateQueries({ queryKey: ["kitchen-stations"] });
    },
  });
}

export function useTestPrinter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<PrintJobDto>(`/printers/${id}/test`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["print-jobs"] }),
  });
}
