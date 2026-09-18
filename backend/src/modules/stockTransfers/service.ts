import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { CreateTransferInput, ListQuery } from "./validation";

const detailInclude = {
  fromOutlet: true,
  toOutlet: true,
  requestedBy: { select: { id: true, name: true } },
  items: { include: { product: true, variant: true } },
};

export async function listTransfers(query: ListQuery) {
  return prisma.stockTransfer.findMany({
    where: {
      status: query.status,
      ...(query.outletId
        ? { OR: [{ fromOutletId: query.outletId }, { toOutletId: query.outletId }] }
        : {}),
    },
    include: { fromOutlet: true, toOutlet: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTransfer(id: string) {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id }, include: detailInclude });
  if (!transfer) throw ApiError.notFound("Stock transfer not found");
  return transfer;
}

export async function createTransfer(requestedByUserId: string, input: CreateTransferInput) {
  return prisma.stockTransfer.create({
    data: {
      fromOutletId: input.fromOutletId,
      toOutletId: input.toOutletId,
      notes: input.notes,
      requestedByUserId,
      items: { create: input.items },
    },
    include: detailInclude,
  });
}

export async function cancelTransfer(id: string) {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id } });
  if (!transfer) throw ApiError.notFound("Stock transfer not found");
  if (transfer.status !== "PENDING") throw ApiError.badRequest("Only pending transfers can be cancelled");
  return prisma.stockTransfer.update({ where: { id }, data: { status: "CANCELLED" }, include: detailInclude });
}

// Decrements stock at the source outlet and marks the transfer in transit.
export async function sendTransfer(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findUnique({ where: { id }, include: { items: true } });
    if (!transfer) throw ApiError.notFound("Stock transfer not found");
    if (transfer.status !== "PENDING") throw ApiError.badRequest("Only pending transfers can be sent");

    for (const item of transfer.items) {
      const stock = await tx.productStock.findFirst({
        where: { productId: item.productId, variantId: item.variantId, outletId: transfer.fromOutletId },
      });
      if (!stock || stock.quantity < item.quantity) {
        throw ApiError.conflict("Insufficient stock at source outlet for one or more items", {
          productId: item.productId,
          variantId: item.variantId,
          available: stock?.quantity ?? 0,
          requested: item.quantity,
        });
      }
      await tx.productStock.update({ where: { id: stock.id }, data: { quantity: { decrement: item.quantity } } });
      await tx.inventoryMovement.create({
        data: {
          outletId: transfer.fromOutletId,
          productId: item.productId,
          variantId: item.variantId,
          type: "TRANSFER_OUT",
          quantityChange: -item.quantity,
          reason: `Transfer ${transfer.id} to outlet ${transfer.toOutletId}`,
          performedByUserId: userId,
        },
      });
    }

    const updated = await tx.stockTransfer.update({
      where: { id },
      data: { status: "IN_TRANSIT", sentAt: new Date() },
      include: detailInclude,
    });

    await recordAudit(tx, {
      userId,
      action: "STOCK_TRANSFER_SENT",
      entityType: "StockTransfer",
      entityId: id,
      outletId: transfer.fromOutletId,
    });

    return updated;
  });
}

// Increments stock at the destination outlet and marks the transfer received.
export async function receiveTransfer(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findUnique({ where: { id }, include: { items: true } });
    if (!transfer) throw ApiError.notFound("Stock transfer not found");
    if (transfer.status !== "IN_TRANSIT") throw ApiError.badRequest("Only in-transit transfers can be received");

    for (const item of transfer.items) {
      const stock = await tx.productStock.findFirst({
        where: { productId: item.productId, variantId: item.variantId, outletId: transfer.toOutletId },
      });
      if (stock) {
        await tx.productStock.update({ where: { id: stock.id }, data: { quantity: { increment: item.quantity } } });
      } else {
        await tx.productStock.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            outletId: transfer.toOutletId,
            quantity: item.quantity,
          },
        });
      }
      await tx.inventoryMovement.create({
        data: {
          outletId: transfer.toOutletId,
          productId: item.productId,
          variantId: item.variantId,
          type: "TRANSFER_IN",
          quantityChange: item.quantity,
          reason: `Transfer ${transfer.id} from outlet ${transfer.fromOutletId}`,
          performedByUserId: userId,
        },
      });
    }

    const updated = await tx.stockTransfer.update({
      where: { id },
      data: { status: "RECEIVED", receivedAt: new Date() },
      include: detailInclude,
    });

    await recordAudit(tx, {
      userId,
      action: "STOCK_TRANSFER_RECEIVED",
      entityType: "StockTransfer",
      entityId: id,
      outletId: transfer.toOutletId,
    });

    return updated;
  });
}
