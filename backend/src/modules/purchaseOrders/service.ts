import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreatePurchaseOrderInput, ListQuery } from "./validation";

const detailInclude = {
  outlet: true,
  supplier: true,
  createdBy: { select: { id: true, name: true } },
  items: { include: { product: true, variant: true } },
};

export async function listPurchaseOrders(query: ListQuery) {
  return prisma.purchaseOrder.findMany({
    where: { outletId: query.outletId, status: query.status },
    include: { supplier: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPurchaseOrder(id: number) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: detailInclude });
  if (!po) throw ApiError.notFound("Purchase order not found");
  return po;
}

export async function createPurchaseOrder(createdByUserId: number, input: CreatePurchaseOrderInput) {
  return prisma.purchaseOrder.create({
    data: {
      outletId: input.outletId,
      supplierId: input.supplierId,
      expectedAt: input.expectedAt ? new Date(input.expectedAt) : undefined,
      notes: input.notes,
      createdByUserId,
      items: { create: input.items },
    },
    include: detailInclude,
  });
}

export async function markOrdered(id: number) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw ApiError.notFound("Purchase order not found");
  if (po.status !== "DRAFT") throw ApiError.badRequest("Only draft purchase orders can be marked ordered");
  return prisma.purchaseOrder.update({
    where: { id },
    data: { status: "ORDERED", orderedAt: new Date() },
    include: detailInclude,
  });
}

export async function cancelPurchaseOrder(id: number) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw ApiError.notFound("Purchase order not found");
  if (po.status === "RECEIVED") throw ApiError.badRequest("A fully received purchase order cannot be cancelled");
  return prisma.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" }, include: detailInclude });
}

// Receiving against a purchase order is handled by the goodsReceivedNotes
// module (creating a GoodsReceivedNote records the delivery, updates stock,
// and rolls this PO's status up) — see backend/src/modules/goodsReceivedNotes.
