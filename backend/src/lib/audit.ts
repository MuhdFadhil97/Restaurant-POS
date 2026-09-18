import { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export async function recordAudit(
  tx: Tx,
  params: {
    userId: number;
    action: string;
    entityType: string;
    entityId: number;
    outletId?: number | null;
    details?: unknown;
  }
) {
  await tx.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      outletId: params.outletId ?? null,
      details: params.details as Prisma.InputJsonValue | undefined,
    },
  });
}
