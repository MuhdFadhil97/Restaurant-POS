import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export type CampaignStatus = "DRAFT" | "SENDING" | "COMPLETED" | "FAILED";
export type CampaignSendStatus = "SENT" | "FAILED" | "SKIPPED_NO_CONSENT" | "SKIPPED_NO_CONTACT";
export type CampaignChannel = "EMAIL";
export type CampaignTriggerType = "MANUAL" | "EVENT_BIRTHDAY" | "EVENT_WINBACK";

export interface CampaignCounts {
  sent: number;
  failed: number;
  skipped: number;
}

export interface Campaign {
  id: number;
  name: string;
  channel: CampaignChannel;
  triggerType: CampaignTriggerType;
  subject: string;
  body: string;
  status: CampaignStatus;
  sentAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  segment: { id: number; name: string };
  createdBy: { id: number; name: string };
  discountId?: number | null;
  counts: CampaignCounts;
}

export interface CampaignSend {
  id: number;
  status: CampaignSendStatus;
  errorMessage: string | null;
  sentAt: string | null;
  customer: { id: number; name: string; email: string | null };
}

export interface CampaignDetail extends Campaign {
  sends: CampaignSend[];
}

export interface CreateCampaignInput {
  name: string;
  segmentId: number;
  channel: CampaignChannel;
  triggerType: CampaignTriggerType;
  subject: string;
  body: string;
  discountId?: number;
}

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => (await apiClient.get<Campaign[]>("/campaigns")).data,
  });
}

export function useCampaign(id: number | undefined) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => (await apiClient.get<CampaignDetail>(`/campaigns/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => (await apiClient.post<Campaign>("/campaigns", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<Campaign>(`/campaigns/${id}/send`)).data,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign", id] });
    },
  });
}

function useCampaignAction(action: "pause" | "resume") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<Campaign>(`/campaigns/${id}/${action}`)).data,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign", id] });
    },
  });
}

export const usePauseCampaign = () => useCampaignAction("pause");
export const useResumeCampaign = () => useCampaignAction("resume");
