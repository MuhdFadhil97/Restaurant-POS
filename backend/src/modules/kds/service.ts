import { PrepStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { QueueQuery } from "./validation";

export async function getQueue(query: QueueQuery) {
  return prisma.transactionItem.findMany({
    where: {
      prepStatus: { not: "SERVED" },
      product: query.stationId ? { stationId: query.stationId } : undefined,
      transaction: {
        outletId: query.outletId,
        status: { in: ["OPEN", "COMPLETED"] },
      },
    },
    include: {
      product: { include: { station: true } },
      variant: true,
      transaction: { include: { table: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function updatePrepStatus(itemId: string, prepStatus: PrepStatus) {
  const item = await prisma.transactionItem.findUnique({ where: { id: itemId } });
  if (!item) throw ApiError.notFound("Transaction item not found");

  const timestampField =
    prepStatus === "PREPARING"
      ? { preparingAt: new Date() }
      : prepStatus === "READY"
      ? { readyAt: new Date() }
      : prepStatus === "SERVED"
      ? { servedAt: new Date() }
      : {};

  return prisma.transactionItem.update({
    where: { id: itemId },
    data: { prepStatus, ...timestampField },
    include: { product: true, variant: true, transaction: { include: { table: true } } },
  });
}
