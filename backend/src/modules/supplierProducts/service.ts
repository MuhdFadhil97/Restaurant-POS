import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateSupplierProductInput, UpdateSupplierProductInput } from "./validation";

export async function listSupplierProducts(supplierId: number) {
  return prisma.supplierProduct.findMany({
    where: { supplierId },
    include: { product: true, variant: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createSupplierProduct(input: CreateSupplierProductInput) {
  return prisma.supplierProduct.create({ data: input, include: { product: true, variant: true } });
}

export async function updateSupplierProduct(id: number, input: UpdateSupplierProductInput) {
  const existing = await prisma.supplierProduct.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Supplier product not found");
  return prisma.supplierProduct.update({ where: { id }, data: input, include: { product: true, variant: true } });
}

export async function deleteSupplierProduct(id: number) {
  const existing = await prisma.supplierProduct.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Supplier product not found");
  await prisma.supplierProduct.delete({ where: { id } });
}

// Price history is derived from past purchase order lines for this
// supplier+product rather than stored separately — every PurchaseOrderItem
// already snapshots the unitCost paid at order time.
export async function getPriceHistory(supplierId: number, productId: number) {
  const items = await prisma.purchaseOrderItem.findMany({
    where: { productId, purchaseOrder: { supplierId } },
    include: { purchaseOrder: { select: { poNumber: true, orderedAt: true, createdAt: true } } },
    orderBy: { purchaseOrder: { createdAt: "desc" } },
  });
  return items.map((item) => ({
    poNumber: item.purchaseOrder.poNumber,
    date: (item.purchaseOrder.orderedAt ?? item.purchaseOrder.createdAt).toISOString(),
    unitCost: item.unitCost,
    quantityOrdered: item.quantityOrdered,
  }));
}
