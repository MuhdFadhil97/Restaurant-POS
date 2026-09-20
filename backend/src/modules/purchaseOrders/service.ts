import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { exportPurchaseOrderToPdf } from "./export/poPdfExporter";
import { calculateItemLine, calculateOrderTotals } from "./calculations";
import {
  CreatePurchaseOrderInput,
  ListQuery,
  RejectPurchaseOrderInput,
  UpdatePurchaseOrderInput,
} from "./validation";

type Tx = Prisma.TransactionClient;

const detailInclude = {
  outlet: true,
  supplier: true,
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  items: { include: { product: true, variant: true, taxRate: true } },
};

// Atomically allocates the next PO number for the current year, formatted as
// PO-YYYY-00001. Mirrors nextReceiptNumber in transactions/service.ts.
async function nextPoNumber(tx: Tx): Promise<string> {
  const year = String(new Date().getFullYear());
  const sequence = await tx.purchaseOrderSequence.upsert({
    where: { year },
    create: { year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return `PO-${year}-${String(sequence.lastNumber).padStart(5, "0")}`;
}

interface ItemInput {
  productId: number;
  variantId?: number;
  quantityOrdered: number;
  unitCost: number;
  taxRateId?: number;
  discountAmount?: number;
}

// Looks up the referenced tax rates and computes persisted per-line and
// header totals, mirroring transactions/calculations.ts's tax-exclusive,
// discount-before-tax convention.
async function buildItemsData(tx: Tx, items: ItemInput[]) {
  const taxRateIds = [...new Set(items.map((i) => i.taxRateId).filter((id): id is number => !!id))];
  const taxRates = taxRateIds.length
    ? await tx.taxRate.findMany({ where: { id: { in: taxRateIds } } })
    : [];
  const taxRateById = new Map(taxRates.map((t) => [t.id, t]));

  const lines = items.map((item) => {
    const discountAmount = item.discountAmount ?? 0;
    const taxRate = item.taxRateId ? taxRateById.get(item.taxRateId) ?? null : null;
    const { taxAmount, lineTotal } = calculateItemLine({
      quantityOrdered: item.quantityOrdered,
      unitCost: item.unitCost,
      discountAmount,
      taxRate,
    });
    return { ...item, discountAmount, taxAmount, lineTotal };
  });

  const totals = calculateOrderTotals(lines);

  const itemsData = lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    quantityOrdered: l.quantityOrdered,
    unitCost: l.unitCost,
    taxRateId: l.taxRateId,
    discountAmount: l.discountAmount,
    taxAmount: l.taxAmount,
    lineTotal: l.lineTotal,
  }));

  return { itemsData, totals };
}

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
  return prisma.$transaction(async (tx) => {
    const poNumber = await nextPoNumber(tx);
    const { itemsData, totals } = await buildItemsData(tx, input.items);
    return tx.purchaseOrder.create({
      data: {
        poNumber,
        outletId: input.outletId,
        supplierId: input.supplierId,
        expectedAt: input.expectedAt ? new Date(input.expectedAt) : undefined,
        notes: input.notes,
        createdByUserId,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        items: { create: itemsData },
      },
      include: detailInclude,
    });
  });
}

export async function updatePurchaseOrder(id: number, input: UpdatePurchaseOrderInput) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw ApiError.notFound("Purchase order not found");
  if (po.status !== "DRAFT") throw ApiError.badRequest("Only draft purchase orders can be edited");

  return prisma.$transaction(async (tx) => {
    let totals: { subtotal: number; discountTotal: number; taxTotal: number; total: number } | undefined;

    if (input.items) {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      const built = await buildItemsData(tx, input.items);
      totals = built.totals;
      await tx.purchaseOrderItem.createMany({
        data: built.itemsData.map((item) => ({ ...item, purchaseOrderId: id })),
      });
    }

    return tx.purchaseOrder.update({
      where: { id },
      data: {
        supplierId: input.supplierId,
        expectedAt: input.expectedAt === undefined ? undefined : input.expectedAt ? new Date(input.expectedAt) : null,
        notes: input.notes,
        ...(totals && {
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
        }),
      },
      include: detailInclude,
    });
  });
}

export async function deletePurchaseOrder(id: number) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw ApiError.notFound("Purchase order not found");
  if (po.status !== "DRAFT") throw ApiError.badRequest("Only draft purchase orders can be deleted");
  await prisma.purchaseOrder.delete({ where: { id } });
}

export async function submitForApproval(id: number, userId: number) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw ApiError.notFound("Purchase order not found");
    if (po.status !== "DRAFT") throw ApiError.badRequest("Only draft purchase orders can be submitted for approval");

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status: "PENDING_APPROVAL", submittedForApprovalAt: new Date() },
      include: detailInclude,
    });
    await recordAudit(tx, {
      userId,
      action: "PO_SUBMITTED_FOR_APPROVAL",
      entityType: "PurchaseOrder",
      entityId: id,
      outletId: po.outletId,
    });
    return updated;
  });
}

export async function approvePurchaseOrder(id: number, approverUserId: number) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw ApiError.notFound("Purchase order not found");
    if (po.status !== "PENDING_APPROVAL") throw ApiError.badRequest("Only purchase orders pending approval can be approved");

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status: "APPROVED", approvedByUserId: approverUserId, approvedAt: new Date() },
      include: detailInclude,
    });
    await recordAudit(tx, {
      userId: approverUserId,
      action: "PO_APPROVED",
      entityType: "PurchaseOrder",
      entityId: id,
      outletId: po.outletId,
    });
    return updated;
  });
}

export async function rejectPurchaseOrder(id: number, userId: number, input: RejectPurchaseOrderInput) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw ApiError.notFound("Purchase order not found");
    if (po.status !== "PENDING_APPROVAL") throw ApiError.badRequest("Only purchase orders pending approval can be rejected");

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: "DRAFT",
        submittedForApprovalAt: null,
        rejectedAt: new Date(),
        rejectionReason: input.reason,
      },
      include: detailInclude,
    });
    await recordAudit(tx, {
      userId,
      action: "PO_REJECTED",
      entityType: "PurchaseOrder",
      entityId: id,
      outletId: po.outletId,
      details: { reason: input.reason },
    });
    return updated;
  });
}

export async function markOrdered(id: number) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw ApiError.notFound("Purchase order not found");
  if (po.status !== "APPROVED") throw ApiError.badRequest("Only approved purchase orders can be marked ordered");
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

export async function getPurchaseOrderPdf(id: number): Promise<Buffer> {
  const po = await getPurchaseOrder(id);
  return exportPurchaseOrderToPdf(po);
}

// Receiving against a purchase order is handled by the goodsReceivedNotes
// module (creating a GoodsReceivedNote records the delivery, updates stock,
// and rolls this PO's status up) — see backend/src/modules/goodsReceivedNotes.
