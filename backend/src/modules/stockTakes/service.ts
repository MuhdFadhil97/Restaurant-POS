import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { SaveCountsInput, StartStockTakeInput } from "./validation";

const detailInclude = {
  outlet: true,
  startedBy: { select: { id: true, name: true } },
  completedBy: { select: { id: true, name: true } },
  items: { include: { product: true, variant: true } },
};

export async function listStockTakes(outletId?: number) {
  return prisma.stockTake.findMany({
    where: { outletId },
    include: {
      startedBy: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function getStockTake(id: number) {
  const stockTake = await prisma.stockTake.findUnique({ where: { id }, include: detailInclude });
  if (!stockTake) throw ApiError.notFound("Stock take not found");
  return stockTake;
}

// Snapshots current stock for every product at the outlet into a count
// sheet — the count sheet's systemQuantity is fixed at this moment, so later
// sales/adjustments during the count don't move the target underneath staff.
export async function startStockTake(userId: number, input: StartStockTakeInput) {
  const stocks = await prisma.productStock.findMany({ where: { outletId: input.outletId } });
  if (stocks.length === 0) throw ApiError.badRequest("This outlet has no stock records to count");

  return prisma.stockTake.create({
    data: {
      outletId: input.outletId,
      startedByUserId: userId,
      notes: input.notes,
      items: {
        create: stocks.map((s) => ({
          productId: s.productId,
          variantId: s.variantId,
          systemQuantity: s.quantity,
        })),
      },
    },
    include: detailInclude,
  });
}

export async function saveCounts(id: number, input: SaveCountsInput) {
  const stockTake = await prisma.stockTake.findUnique({ where: { id }, include: { items: true } });
  if (!stockTake) throw ApiError.notFound("Stock take not found");
  if (stockTake.status !== "IN_PROGRESS") throw ApiError.badRequest("Only an in-progress stock take can be counted");

  for (const entry of input.items) {
    const item = stockTake.items.find((i) => i.id === entry.id);
    if (!item) throw ApiError.badRequest(`Item ${entry.id} does not belong to this stock take`);
  }

  await prisma.$transaction(
    input.items.map((entry) =>
      prisma.stockTakeItem.update({
        where: { id: entry.id },
        data: { countedQuantity: entry.countedQuantity, notes: entry.notes },
      })
    )
  );

  return getStockTake(id);
}

// Applies a CORRECTION inventory movement for every counted item whose
// counted quantity differs from its snapshot, then closes the stock take.
// Items never counted (countedQuantity still null) are left untouched.
export async function completeStockTake(id: number, userId: number) {
  return prisma.$transaction(async (tx) => {
    const stockTake = await tx.stockTake.findUnique({ where: { id }, include: { items: true } });
    if (!stockTake) throw ApiError.notFound("Stock take not found");
    if (stockTake.status !== "IN_PROGRESS") throw ApiError.badRequest("Only an in-progress stock take can be completed");

    let correctionsApplied = 0;
    for (const item of stockTake.items) {
      if (item.countedQuantity === null) continue;
      const variance = item.countedQuantity - item.systemQuantity;
      if (variance === 0) continue;
      correctionsApplied += 1;

      const stock = await tx.productStock.findFirst({
        where: { productId: item.productId, variantId: item.variantId, outletId: stockTake.outletId },
      });
      if (stock) {
        await tx.productStock.update({ where: { id: stock.id }, data: { quantity: item.countedQuantity } });
      } else {
        await tx.productStock.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            outletId: stockTake.outletId,
            quantity: item.countedQuantity,
          },
        });
      }

      await tx.inventoryMovement.create({
        data: {
          outletId: stockTake.outletId,
          productId: item.productId,
          variantId: item.variantId,
          type: "CORRECTION",
          quantityChange: variance,
          reason: `Stock take ${stockTake.id}`,
          performedByUserId: userId,
        },
      });
    }

    const updated = await tx.stockTake.update({
      where: { id },
      data: { status: "COMPLETED", completedByUserId: userId, completedAt: new Date() },
      include: detailInclude,
    });

    await recordAudit(tx, {
      userId,
      action: "STOCK_TAKE_COMPLETED",
      entityType: "StockTake",
      entityId: id,
      outletId: stockTake.outletId,
      details: { correctionsApplied },
    });

    return updated;
  });
}

export async function cancelStockTake(id: number) {
  const stockTake = await prisma.stockTake.findUnique({ where: { id } });
  if (!stockTake) throw ApiError.notFound("Stock take not found");
  if (stockTake.status !== "IN_PROGRESS") throw ApiError.badRequest("Only an in-progress stock take can be cancelled");
  return prisma.stockTake.update({ where: { id }, data: { status: "CANCELLED" }, include: detailInclude });
}
