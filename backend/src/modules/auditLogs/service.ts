import { prisma } from "../../lib/prisma";

export interface AuditLogQuery {
  outletId?: string;
  userId?: string;
  action?: string;
  limit?: number;
}

export async function listAuditLogs(query: AuditLogQuery) {
  return prisma.auditLog.findMany({
    where: {
      outletId: query.outletId,
      userId: query.userId,
      action: query.action,
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: query.limit ?? 100,
  });
}
