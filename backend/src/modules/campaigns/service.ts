import { Customer } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { sendEmail } from "../../lib/notifications/emailProvider";
import { getSegment, evaluateSegment } from "../segments/service";
import { CreateCampaignInput } from "./validation";

const detailInclude = {
  segment: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
};

export async function listCampaigns() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { ...detailInclude, sends: { select: { status: true } } },
  });
  return campaigns.map(withSendCounts);
}

export async function getCampaign(id: number) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      ...detailInclude,
      sends: { include: { customer: { select: { id: true, name: true, email: true } } }, orderBy: { id: "asc" } },
    },
  });
  if (!campaign) throw ApiError.notFound("Campaign not found");
  return { ...withSendCounts(campaign), sends: campaign.sends };
}

function withSendCounts<T extends { sends: { status: string }[] }>(campaign: T) {
  const counts = { sent: 0, failed: 0, skipped: 0 };
  for (const s of campaign.sends) {
    if (s.status === "SENT") counts.sent++;
    else if (s.status === "FAILED") counts.failed++;
    else counts.skipped++;
  }
  const { sends: _sends, ...rest } = campaign;
  return { ...rest, counts };
}

export async function createCampaign(input: CreateCampaignInput, createdByUserId: number) {
  await getSegment(input.segmentId);
  return prisma.campaign.create({
    data: {
      name: input.name,
      segmentId: input.segmentId,
      channel: input.channel,
      triggerType: input.triggerType,
      subject: input.subject,
      body: input.body,
      discountId: input.discountId,
      createdByUserId,
    },
    include: detailInclude,
  });
}

function renderBody(body: string, customerName: string): string {
  return body.replace(/\{\{customerName\}\}/g, customerName);
}

type SendOutcome = { status: "SENT" | "FAILED" | "SKIPPED_NO_CONSENT" | "SKIPPED_NO_CONTACT"; errorMessage?: string };

// One customer, one channel dispatch. Shared by the manual "Send Now" path
// and the automated scheduler so both record identical CampaignSend rows.
async function dispatchToCustomer(
  campaign: { channel: string; subject: string; body: string },
  customer: Customer
): Promise<SendOutcome> {
  if (!customer.marketingConsent) return { status: "SKIPPED_NO_CONSENT" };

  const message = renderBody(campaign.body, customer.name);
  try {
    if (campaign.channel === "EMAIL") {
      if (!customer.email) return { status: "SKIPPED_NO_CONTACT" };
      await sendEmail(customer.email, campaign.subject, message);
    } else {
      throw new Error(`Channel ${campaign.channel} has no adapter yet`);
    }
    return { status: "SENT" };
  } catch (err) {
    return { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Send failed" };
  }
}

// Evaluates the segment right now (no precomputed membership — see
// planning.md 9.4), snapshots one CampaignSend row per matching customer,
// and sends each independently: one recipient's failure doesn't abort the
// rest, same "partial failure is fine, keep going" shape as the
// delivery-webhook pipeline. Only for one-shot MANUAL campaigns — automated
// ones are picked up by runAutomatedCampaigns() below instead.
export async function sendCampaign(id: number) {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) throw ApiError.notFound("Campaign not found");
  if (campaign.status !== "DRAFT") {
    throw ApiError.badRequest(`Cannot send a campaign with status ${campaign.status}`);
  }
  if (campaign.triggerType !== "MANUAL") {
    throw ApiError.badRequest(
      `${campaign.triggerType} campaigns run automatically — use pause/resume, not Send Now.`
    );
  }

  await prisma.campaign.update({ where: { id }, data: { status: "SENDING" } });

  const segment = await getSegment(campaign.segmentId);
  const customers = await evaluateSegment(segment);

  for (const customer of customers) {
    const outcome = await dispatchToCustomer(campaign, customer);
    await prisma.campaignSend.create({
      data: {
        campaignId: id,
        customerId: customer.id,
        status: outcome.status,
        errorMessage: outcome.errorMessage,
        sentAt: outcome.status === "SENT" ? new Date() : undefined,
      },
    });
  }

  return prisma.campaign.update({
    where: { id },
    data: { status: "COMPLETED", sentAt: new Date() },
    include: detailInclude,
  });
}

export async function pauseCampaign(id: number) {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) throw ApiError.notFound("Campaign not found");
  if (campaign.triggerType === "MANUAL") {
    throw ApiError.badRequest("Only automated (birthday/win-back) campaigns can be paused");
  }
  return prisma.campaign.update({ where: { id }, data: { pausedAt: new Date() }, include: detailInclude });
}

export async function resumeCampaign(id: number) {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) throw ApiError.notFound("Campaign not found");
  return prisma.campaign.update({ where: { id }, data: { pausedAt: null }, include: detailInclude });
}

// How long to wait before a customer can be re-evaluated by the same
// automated campaign. Applies uniformly to every outcome (SENT, FAILED, or
// SKIPPED_*) — without this, a still-matching customer (e.g. still lapsed,
// still within their birthday window) would get a fresh row every tick,
// spamming both the recipient and the campaign's send history. 180 days
// comfortably separates one birthday from the next and gives a win-back
// send room to actually bring the customer back before re-targeting them.
const RESEND_COOLDOWN_DAYS = 180;

async function wasRecentlyProcessed(campaignId: number, customerId: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - RESEND_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const recent = await prisma.campaignSend.findFirst({
    where: { campaignId, customerId, createdAt: { gte: cutoff } },
  });
  return !!recent;
}

// Called on a recurring tick (see lib/campaigns/scheduler.ts) — evaluates
// every active EVENT_BIRTHDAY/EVENT_WINBACK campaign's segment and sends to
// any newly-matching, not-recently-processed customer. Unlike sendCampaign,
// this never flips `status`: an automated campaign has no "done" state,
// only paused/resumed.
export async function runAutomatedCampaigns(): Promise<{ campaignId: number; processed: number }[]> {
  const campaigns = await prisma.campaign.findMany({
    where: { triggerType: { in: ["EVENT_BIRTHDAY", "EVENT_WINBACK"] }, pausedAt: null },
  });

  const results: { campaignId: number; processed: number }[] = [];

  for (const campaign of campaigns) {
    const segment = await getSegment(campaign.segmentId);
    const customers = await evaluateSegment(segment);
    let processed = 0;

    for (const customer of customers) {
      if (await wasRecentlyProcessed(campaign.id, customer.id)) continue;

      const outcome = await dispatchToCustomer(campaign, customer);
      await prisma.campaignSend.create({
        data: {
          campaignId: campaign.id,
          customerId: customer.id,
          status: outcome.status,
          errorMessage: outcome.errorMessage,
          sentAt: outcome.status === "SENT" ? new Date() : undefined,
        },
      });
      processed++;
    }

    results.push({ campaignId: campaign.id, processed });
  }

  return results;
}
