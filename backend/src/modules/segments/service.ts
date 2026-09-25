import { Customer } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateSegmentInput } from "./validation";

export async function listSegments() {
  return prisma.customerSegment.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function createSegment(input: CreateSegmentInput, createdByUserId: number) {
  return prisma.customerSegment.create({
    data: {
      name: input.name,
      ruleType: input.ruleType,
      ruleValue: input.ruleType === "ALL_CUSTOMERS" ? null : input.ruleValue,
      createdByUserId,
    },
  });
}

export async function getSegment(id: number) {
  const segment = await prisma.customerSegment.findUnique({ where: { id } });
  if (!segment) throw ApiError.notFound("Segment not found");
  return segment;
}

// Every rule type resolves via exactly one query — see modules/segments in
// planning.md 9.4 for why this is a structured ruleType + single numeric
// threshold rather than a free-form rule engine.
export async function evaluateSegment(segment: { ruleType: string; ruleValue: number | null }): Promise<Customer[]> {
  switch (segment.ruleType) {
    case "ALL_CUSTOMERS":
      return prisma.customer.findMany({ where: { deletedAt: null } });

    case "NO_VISIT_SINCE_DAYS": {
      const cutoff = new Date(Date.now() - segment.ruleValue! * 24 * 60 * 60 * 1000);
      const recent = await prisma.transaction.findMany({
        where: { status: "COMPLETED", customerId: { not: null }, createdAt: { gte: cutoff } },
        select: { customerId: true },
        distinct: ["customerId"],
      });
      const recentIds = recent.map((r) => r.customerId!);
      return prisma.customer.findMany({ where: { deletedAt: null, id: { notIn: recentIds } } });
    }

    case "BIRTHDAY_WITHIN_DAYS": {
      const customers = await prisma.customer.findMany({ where: { deletedAt: null, dateOfBirth: { not: null } } });
      const days = segment.ruleValue!;
      const today = startOfDay(new Date());
      return customers.filter((c) => {
        const next = nextBirthdayOccurrence(c.dateOfBirth!, today);
        const diffDays = Math.round((next.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        return diffDays >= 0 && diffDays <= days;
      });
    }

    case "TOTAL_SPEND_ABOVE": {
      const grouped = await prisma.transaction.groupBy({
        by: ["customerId"],
        where: { status: "COMPLETED", customerId: { not: null } },
        _sum: { total: true },
      });
      const qualifyingIds = grouped
        .filter((g) => Number(g._sum.total ?? 0) >= segment.ruleValue!)
        .map((g) => g.customerId!);
      return prisma.customer.findMany({ where: { deletedAt: null, id: { in: qualifyingIds } } });
    }

    default:
      return [];
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// The next calendar occurrence (this year, or next year if it already
// passed) of a birthday's month/day, ignoring the stored birth year —
// handles the Dec→Jan wraparound correctly since it's a real Date, not raw
// month/day arithmetic.
function nextBirthdayOccurrence(dateOfBirth: Date, today: Date): Date {
  const thisYear = new Date(today.getFullYear(), dateOfBirth.getMonth(), dateOfBirth.getDate());
  return thisYear >= today ? thisYear : new Date(today.getFullYear() + 1, dateOfBirth.getMonth(), dateOfBirth.getDate());
}

export async function previewSegment(id: number) {
  const segment = await getSegment(id);
  const customers = await evaluateSegment(segment);
  const consented = customers.filter((c) => c.marketingConsent);
  return {
    totalMatched: customers.length,
    consentedCount: consented.length,
    sample: customers.slice(0, 50),
  };
}
