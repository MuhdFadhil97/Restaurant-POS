import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import { EInvoiceVerifyResponse } from "./types";

export function useEInvoiceVerify(uuid: string, longId: string) {
  return useQuery({
    queryKey: ["einvoice-verify", uuid, longId],
    queryFn: async () => (await apiClient.get<EInvoiceVerifyResponse>(`/einvoice/${uuid}/share/${longId}`)).data,
    enabled: !!uuid && !!longId,
    retry: false,
  });
}
