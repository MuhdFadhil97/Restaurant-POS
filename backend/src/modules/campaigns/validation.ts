import { z } from "zod";

// SMS and PUSH have no adapter (no SMS provider or device-token infra exists
// anywhere in the app), so only EMAIL is creatable — same reasoning as
// excluding SCHEDULED below.
export const campaignChannelSchema = z.enum(["EMAIL"]);

// SCHEDULED has no adapter (no arbitrary cron-expression config exists on
// Campaign) — only MANUAL (send-now) and the two segment-driven automated
// triggers are creatable. EVENT_BIRTHDAY/EVENT_WINBACK campaigns are picked
// up by the scheduler (see lib/campaigns/scheduler.ts) rather than sent via
// POST /:id/send.
export const campaignTriggerTypeSchema = z.enum(["MANUAL", "EVENT_BIRTHDAY", "EVENT_WINBACK"]);

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  segmentId: z.coerce.number().int(),
  channel: campaignChannelSchema.default("EMAIL"),
  triggerType: campaignTriggerTypeSchema.default("MANUAL"),
  subject: z.string().min(1),
  body: z.string().min(1),
  discountId: z.coerce.number().int().optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
