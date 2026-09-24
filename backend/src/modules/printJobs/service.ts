import { PrintJobStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { JwtPayload } from "../../lib/jwt";
import { assertOutletAccess } from "../../lib/outletAccess";
import { notifyQueueChanged, printJobSummarySelect } from "../../lib/printing/queue";

export async function listPrintJobs(query: { outletId: number; status?: PrintJobStatus; limit?: number }) {
  return prisma.printJob.findMany({
    where: { outletId: query.outletId, status: query.status },
    select: printJobSummarySelect,
    orderBy: { id: "desc" },
    take: Math.min(query.limit ?? 50, 200),
  });
}

async function findJob(id: number, user: JwtPayload | undefined) {
  const job = await prisma.printJob.findUnique({ where: { id }, select: printJobSummarySelect });
  if (!job) throw ApiError.notFound("Print job not found");
  assertOutletAccess(user, job.outletId);
  return job;
}

export async function getPrintJob(id: number, user: JwtPayload | undefined) {
  return findJob(id, user);
}

export async function retryPrintJob(id: number, user: JwtPayload | undefined) {
  const job = await findJob(id, user);
  if (job.status !== "FAILED") throw ApiError.conflict("Only failed jobs can be retried");
  const updated = await prisma.printJob.update({
    where: { id },
    data: { status: "PENDING", attempts: 0, lastError: null, claimedAt: null },
    select: printJobSummarySelect,
  });
  notifyQueueChanged();
  return updated;
}
