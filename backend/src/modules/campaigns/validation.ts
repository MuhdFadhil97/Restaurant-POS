import { z } from "zod";

// channel/triggerType aren't exposed here — v1 only wires up EMAIL +
// MANUAL (see planning.md 9.4); both are hardcoded in service.createCampaign
// rather than accepted from the client, so a request can't create a
// campaign shaped for a send path that doesn't exist yet.
export const createCampaignSchema = z.object({
  name: z.string().min(1),
  segmentId: z.coerce.number().int(),
  subject: z.string().min(1),
  body: z.string().min(1),
  discountId: z.coerce.number().int().optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
