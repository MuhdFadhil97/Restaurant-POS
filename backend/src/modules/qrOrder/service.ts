import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { getOrCreateSystemUserId } from "../../lib/systemUser";
import * as transactionsService from "../transactions/service";
import { SubmitOrderInput } from "./validation";

// Deliberately generic — never distinguishes "no such token" from "table
// deleted" or "outlet deactivated" to a caller with no other credentials.
async function resolveTableByToken(token: string) {
  const table = await prisma.table.findFirst({
    where: { qrToken: token, deletedAt: null, outlet: { isActive: true } },
    include: { outlet: { select: { id: true, name: true } } },
  });
  if (!table) throw ApiError.notFound("Invalid or expired QR code");
  return table;
}

// Shapes a table's current OPEN transaction into the lightweight, public-safe
// view both getMenu and the status/submit endpoints return — no cost price,
// no cashier identity, no other tables' data.
async function getActiveOrderView(tableId: number) {
  const transaction = await prisma.transaction.findFirst({
    where: { tableId, status: "OPEN" },
    include: { items: { include: { product: true, variant: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  if (!transaction) return null;

  return {
    id: transaction.id,
    subtotal: transaction.subtotal,
    discountTotal: transaction.discountTotal,
    serviceChargeTotal: transaction.serviceChargeTotal,
    taxTotal: transaction.taxTotal,
    total: transaction.total,
    items: transaction.items.map((item) => ({
      id: item.id,
      productName: item.product.name,
      variantValue: item.variant?.value ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      prepStatus: item.prepStatus,
    })),
  };
}

export async function getMenu(token: string) {
  const table = await resolveTableByToken(token);

  const products = await prisma.product.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
      unitPrice: true,
      unitOfMeasure: true,
      imageUrl: true,
      variants: {
        where: { deletedAt: null },
        select: { id: true, name: true, value: true, priceAdjustment: true },
      },
      stocks: { where: { outletId: table.outletId }, select: { quantity: true } },
    },
    orderBy: { name: "asc" },
  });

  return {
    outlet: table.outlet,
    table: { id: table.id, name: table.name },
    menu: products,
    activeOrder: await getActiveOrderView(table.id),
  };
}

export async function getOrderStatus(token: string) {
  const table = await resolveTableByToken(token);
  return {
    table: { id: table.id, name: table.name },
    order: await getActiveOrderView(table.id),
  };
}

export async function submitOrder(token: string, items: SubmitOrderInput["items"]) {
  const table = await resolveTableByToken(token);
  const systemCashierId = await getOrCreateSystemUserId();
  await transactionsService.createOrAppendQrOrder(table.outletId, table.id, items, systemCashierId);
  return {
    table: { id: table.id, name: table.name },
    order: await getActiveOrderView(table.id),
  };
}
