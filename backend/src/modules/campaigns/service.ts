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

// Evaluates the segment right now (no precomputed membership — see
// planning.md 9.4 on why there's no scheduler in v1), snapshots one
// CampaignSend row per matching customer, and sends each independently: one
// recipient's failure doesn't abort the rest, same "partial failure is
// fine, keep going" shape as the delivery-webhook pipeline.
export async function sendCampaign(id: number) {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) throw ApiError.notFound("Campaign not found");
  if (campaign.status !== "DRAFT") {
    throw ApiError.badRequest(`Cannot send a campaign with status ${campaign.status}`);
  }
  if (campaign.triggerType !== "MANUAL") {
    throw ApiError.badRequest(`Trigger type ${campaign.triggerType} isn't supported yet — only MANUAL sends can be triggered.`);
  }

  await prisma.campaign.update({ where: { id }, data: { status: "SENDING" } });

  const segment = await getSegment(campaign.segmentId);
  const customers = await evaluateSegment(segment);

  for (const customer of customers) {
    if (!customer.marketingConsent) {
      await prisma.campaignSend.create({
        data: { campaignId: id, customerId: customer.id, status: "SKIPPED_NO_CONSENT" },
      });
      continue;
    }
    if (!customer.email) {
      await prisma.campaignSend.create({
        data: { campaignId: id, customerId: customer.id, status: "SKIPPED_NO_CONTACT" },
      });
      continue;
    }
    try {
      await sendEmail(customer.email, campaign.subject, renderBody(campaign.body, customer.name));
      await prisma.campaignSend.create({
        data: { campaignId: id, customerId: customer.id, status: "SENT", sentAt: new Date() },
      });
    } catch (err) {
      await prisma.campaignSend.create({
        data: {
          campaignId: id,
          customerId: customer.id,
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : "Send failed",
        },
      });
    }
  }

  return prisma.campaign.update({
    where: { id },
    data: { status: "COMPLETED", sentAt: new Date() },
    include: detailInclude,
  });
}
