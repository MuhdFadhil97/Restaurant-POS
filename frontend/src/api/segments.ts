import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { Customer } from "./types";

export type SegmentRuleType = "ALL_CUSTOMERS" | "NO_VISIT_SINCE_DAYS" | "BIRTHDAY_WITHIN_DAYS" | "TOTAL_SPEND_ABOVE";

export interface CustomerSegment {
  id: number;
  name: string;
  ruleType: SegmentRuleType;
  ruleValue: number | null;
  createdAt: string;
  createdBy: { id: number; name: string };
}

export interface SegmentPreview {
  totalMatched: number;
  consentedCount: number;
  sample: Customer[];
}

export interface CreateSegmentInput {
  name: string;
  ruleType: SegmentRuleType;
  ruleValue?: number;
}

export function useSegments() {
  return useQuery({
    queryKey: ["segments"],
    queryFn: async () => (await apiClient.get<CustomerSegment[]>("/segments")).data,
  });
}

export function useSegmentPreview(id: number | undefined) {
  return useQuery({
    queryKey: ["segment-preview", id],
    queryFn: async () => (await apiClient.get<SegmentPreview>(`/segments/${id}/preview`)).data,
    enabled: !!id,
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSegmentInput) => (await apiClient.post<CustomerSegment>("/segments", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["segments"] }),
  });
}
