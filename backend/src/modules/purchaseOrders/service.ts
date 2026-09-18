import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { CreatePurchaseOrderInput, ListQuery, ReceiveInput } from "./validation";

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

// Receiving increments ProductStock and records an InventoryMovement per
// line, atomically, then rolls the PO status up to PARTIALLY_RECEIVED or
// RECEIVED depending on whether every line is now fully received.
export async function receivePurchaseOrder(id: number, userId: number, input: ReceiveInput) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!po) throw ApiError.notFound("Purchase order not found");
    if (po.status === "RECEIVED" || po.status === "CANCELLED") {
      throw ApiError.badRequest(`Cannot receive against a ${po.status.toLowerCase()} purchase order`);
    }

    for (const receipt of input.items) {
      const item = po.items.find((i) => i.id === receipt.itemId);
      if (!item) throw ApiError.badRequest(`Item ${receipt.itemId} does not belong to this purchase order`);
      if (receipt.quantityReceived <= 0) continue;

      const newQuantityReceived = item.quantityReceived + receipt.quantityReceived;
      if (newQuantityReceived > item.quantityOrdered) {
        throw ApiError.badRequest(`Received quantity exceeds ordered quantity for item ${item.id}`);
      }

      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { quantityReceived: newQuantityReceived },
      });

      const existingStock = await tx.productStock.findFirst({
        where: { productId: item.productId, variantId: item.variantId, outletId: po.outletId },
      });
      if (existingStock) {
        await tx.productStock.update({
          where: { id: existingStock.id },
          data: { quantity: { increment: receipt.quantityReceived } },
        });
      } else {
        await tx.productStock.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            outletId: po.outletId,
            quantity: receipt.quantityReceived,
          },
        });
      }

      await tx.inventoryMovement.create({
        data: {
          outletId: po.outletId,
          productId: item.productId,
          variantId: item.variantId,
          type: "RESTOCK",
          quantityChange: receipt.quantityReceived,
          reason: `Purchase order ${po.id}`,
          performedByUserId: userId,
        },
      });
    }

    const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
    const fullyReceived = refreshedItems.every((i) => i.quantityReceived >= i.quantityOrdered);
    const anyReceived = refreshedItems.some((i) => i.quantityReceived > 0);

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: fullyReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status,
        receivedAt: fullyReceived ? new Date() : po.receivedAt,
      },
      include: detailInclude,
    });

    await recordAudit(tx, {
      userId,
      action: "PURCHASE_ORDER_RECEIVED",
      entityType: "PurchaseOrder",
      entityId: id,
      outletId: po.outletId,
      details: { items: input.items },
    });

    return updated;
  });
}
