import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { CreateGrnInput, ListQuery } from "./validation";

const detailInclude = {
  purchaseOrder: { include: { supplier: true } },
  outlet: true,
  receivedBy: { select: { id: true, name: true } },
  items: { include: { product: true, variant: true } },
};

export async function listGrns(query: ListQuery) {
  return prisma.goodsReceivedNote.findMany({
    where: { outletId: query.outletId, purchaseOrderId: query.purchaseOrderId },
    include: {
      purchaseOrder: { include: { supplier: true } },
      receivedBy: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { receivedAt: "desc" },
  });
}

export async function getGrn(id: number) {
  const grn = await prisma.goodsReceivedNote.findUnique({ where: { id }, include: detailInclude });
  if (!grn) throw ApiError.notFound("Goods received note not found");
  return grn;
}

// Records one delivery against a purchase order: accepted quantities go into
// stock as a RESTOCK movement, rejected quantities are recorded on the GRN
// but never touch stock. Rolls the PO status up the same way the old inline
// receive flow did — PARTIALLY_RECEIVED once anything is accepted, RECEIVED
// once every line has received its full ordered quantity.
export async function createGrn(userId: number, input: CreateGrnInput) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id: input.purchaseOrderId }, include: { items: true } });
    if (!po) throw ApiError.notFound("Purchase order not found");
    if (po.status === "RECEIVED" || po.status === "CANCELLED") {
      throw ApiError.badRequest(`Cannot receive against a ${po.status.toLowerCase()} purchase order`);
    }

    const grnItemsData: {
      purchaseOrderItemId: number;
      productId: number;
      variantId: number | null;
      quantityReceived: number;
      quantityRejected: number;
      rejectionReason?: string;
      unitCost: import("@prisma/client").Prisma.Decimal;
    }[] = [];

    for (const receipt of input.items) {
      const item = po.items.find((i) => i.id === receipt.purchaseOrderItemId);
      if (!item) throw ApiError.badRequest(`Item ${receipt.purchaseOrderItemId} does not belong to this purchase order`);

      const accounted = receipt.quantityReceived + receipt.quantityRejected;
      if (accounted === 0) continue;

      const remaining = item.quantityOrdered - item.quantityReceived;
      if (accounted > remaining) {
        throw ApiError.badRequest(`Received + rejected quantity exceeds the remaining ordered quantity for item ${item.id}`);
      }

      if (receipt.quantityReceived > 0) {
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: { increment: receipt.quantityReceived } },
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

      grnItemsData.push({
        purchaseOrderItemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantityReceived: receipt.quantityReceived,
        quantityRejected: receipt.quantityRejected,
        rejectionReason: receipt.rejectionReason,
        unitCost: item.unitCost,
      });
    }

    if (grnItemsData.length === 0) throw ApiError.badRequest("At least one item must have a received or rejected quantity");

    const grn = await tx.goodsReceivedNote.create({
      data: {
        purchaseOrderId: po.id,
        outletId: po.outletId,
        receivedByUserId: userId,
        notes: input.notes,
        items: { create: grnItemsData },
      },
      include: detailInclude,
    });

    const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
    const fullyReceived = refreshedItems.every((i) => i.quantityReceived >= i.quantityOrdered);
    const anyReceived = refreshedItems.some((i) => i.quantityReceived > 0);

    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: fullyReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status,
        receivedAt: fullyReceived ? new Date() : po.receivedAt,
      },
    });

    await recordAudit(tx, {
      userId,
      action: "GOODS_RECEIVED",
      entityType: "GoodsReceivedNote",
      entityId: grn.id,
      outletId: po.outletId,
      details: { purchaseOrderId: po.id, items: input.items },
    });

    return grn;
  });
}
