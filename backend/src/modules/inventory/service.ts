import { prisma } from "../../lib/prisma";
import { recordAudit } from "../../lib/audit";
import { StockAdjustmentInput } from "./validation";

export async function adjustStock(userId: number, input: StockAdjustmentInput) {
  return prisma.$transaction(async (tx) => {
    const variantId = input.variantId ?? null;

    // Prisma's compound-unique input type requires non-null fields, so a
    // nullable variantId can't be used with upsert's composite `where` —
    // look the row up manually instead.
    const existingStock = await tx.productStock.findFirst({
      where: { productId: input.productId, variantId, outletId: input.outletId },
    });
    const stock = existingStock
      ? await tx.productStock.update({
          where: { id: existingStock.id },
          data: { quantity: { increment: input.quantityChange } },
        })
      : await tx.productStock.create({
          data: {
            productId: input.productId,
            variantId,
            outletId: input.outletId,
            quantity: Math.max(input.quantityChange, 0),
          },
        });

    const movement = await tx.inventoryMovement.create({
      data: {
        outletId: input.outletId,
        productId: input.productId,
        variantId: input.variantId,
        type: input.type,
        quantityChange: input.quantityChange,
        reason: input.reason,
        performedByUserId: userId,
      },
    });

    await recordAudit(tx, {
      userId,
      action: "STOCK_ADJUSTMENT",
      entityType: "Product",
      entityId: input.productId,
      outletId: input.outletId,
      details: { type: input.type, quantityChange: input.quantityChange, reason: input.reason },
    });

    return { stock, movement };
  });
}

export async function listMovements(outletId: number, productId?: number) {
  return prisma.inventoryMovement.findMany({
    where: { outletId, ...(productId ? { productId } : {}) },
    include: { product: true, variant: true, performedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listLowStock(outletId: number) {
  const stocks = await prisma.productStock.findMany({
    where: { outletId },
    include: { product: true, variant: true },
  });
  return stocks.filter((s) => s.quantity <= s.product.lowStockThreshold);
}
