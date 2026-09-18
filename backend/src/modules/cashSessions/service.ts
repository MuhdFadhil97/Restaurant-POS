import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { round2 } from "../transactions/calculations";
import { CloseSessionInput, OpenSessionInput } from "./validation";

export async function openSession(userId: number, input: OpenSessionInput) {
  const existingOpen = await prisma.cashSession.findFirst({
    where: { userId, outletId: input.outletId, status: "OPEN" },
  });
  if (existingOpen) {
    throw ApiError.conflict("You already have an open cash session for this outlet");
  }

  return prisma.cashSession.create({
    data: { userId, outletId: input.outletId, openingCash: input.openingCash },
  });
}

export async function closeSession(id: number, input: CloseSessionInput) {
  const session = await prisma.cashSession.findUnique({ where: { id } });
  if (!session) throw ApiError.notFound("Cash session not found");
  if (session.status === "CLOSED") throw ApiError.badRequest("Session already closed");

  const cashPayments = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      method: "CASH",
      transaction: {
        outletId: session.outletId,
        status: "COMPLETED",
        createdAt: { gte: session.openedAt },
      },
    },
  });

  const expectedCash = round2(Number(session.openingCash) + Number(cashPayments._sum.amount ?? 0));
  const difference = round2(input.actualCash - expectedCash);

  return prisma.cashSession.update({
    where: { id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      expectedCash,
      actualCash: input.actualCash,
      difference,
    },
  });
}

export async function getCurrentSession(userId: number, outletId: number) {
  return prisma.cashSession.findFirst({ where: { userId, outletId, status: "OPEN" } });
}

export async function listSessions(outletId: number) {
  return prisma.cashSession.findMany({
    where: { outletId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { openedAt: "desc" },
  });
}
