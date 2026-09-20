import bcrypt from "bcryptjs";
import { Prisma, PrismaClient, TransactionStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { calculateLine, calculateTotals, round2 } from "./calculations";
import { generateSimulatedEInvoice } from "./einvoice";
import {
  AddItemInput,
  CheckoutInput,
  CreateDraftInput,
  FinalizeInput,
  ListQuery,
  UpdateItemInput,
  UpdateTransactionInput,
  VoidInput,
} from "./validation";

type Tx = PrismaClient | Prisma.TransactionClient;

const detailInclude = {
  items: {
    include: {
      product: true,
      variant: true,
      discount: true,
    },
  },
  payments: { include: { giftCard: { select: { id: true, code: true } } } },
  outlet: true,
  table: true,
  customer: true,
  cashier: { select: { id: true, name: true } },
  orderDiscount: true,
};

// Recomputes and persists every item's price breakdown plus the parent
// transaction's totals. Called after any change to items or the order-level
// discount so stored totals never drift from the source data.
async function recalculate(tx: Tx, transactionId: number) {
  const transaction = await tx.transaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: {
      items: { include: { product: { include: { taxRate: true } }, variant: true, discount: true } },
      orderDiscount: true,
      outlet: { include: { taxRates: { where: { isDefault: true }, take: 1 } } },
    },
  });

  const lineResults = transaction.items.map((item) =>
    calculateLine({
      product: item.product,
      variant: item.variant,
      quantity: item.quantity,
      discount: item.discount,
    })
  );

  await Promise.all(
    transaction.items.map((item, i) =>
      tx.transactionItem.update({
        where: { id: item.id },
        data: {
          unitPrice: lineResults[i].unitPrice,
          discountAmount: lineResults[i].discountAmount,
          taxAmount: lineResults[i].taxAmount,
          lineTotal: lineResults[i].lineTotal,
        },
      })
    )
  );

  const lineSubtotals = transaction.items.map((item, i) => lineResults[i].unitPrice * item.quantity);
  const totals = calculateTotals(lineResults, lineSubtotals, transaction.orderDiscount, {
    enabled: transaction.outlet.serviceChargeEnabled,
    rate: Number(transaction.outlet.serviceChargeRate),
    taxRate: Number(transaction.outlet.taxRates[0]?.rate ?? 0),
  });

  return tx.transaction.update({
    where: { id: transactionId },
    data: {
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      serviceChargeTotal: totals.serviceChargeTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
    },
    include: detailInclude,
  });
}

async function ensureMutable(tx: Tx, transactionId: number) {
  const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) throw ApiError.notFound("Transaction not found");
  if (transaction.status !== "HELD" && transaction.status !== "OPEN") {
    throw ApiError.badRequest(`Cannot modify a transaction with status ${transaction.status}`);
  }
  return transaction;
}

export async function createDraft(cashierId: number, input: CreateDraftInput) {
  return prisma.$transaction(async (tx) => {
    const status: TransactionStatus = input.tableId ? "OPEN" : "HELD";

    if (input.tableId) {
      const table = await tx.table.findFirst({ where: { id: input.tableId, deletedAt: null } });
      if (!table) throw ApiError.notFound("Table not found");
      if (table.status === "NOT_AVAILABLE") {
        throw ApiError.badRequest("Table is not available");
      }
      await tx.table.update({ where: { id: input.tableId }, data: { status: "OCCUPIED" } });
    }

    const created = await tx.transaction.create({
      data: {
        outletId: input.outletId,
        tableId: input.tableId,
        customerId: input.customerId,
        orderDiscountId: input.orderDiscountId,
        notes: input.notes,
        cashierId,
        status,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            discountId: item.discountId,
            unitPrice: 0,
            lineTotal: 0,
          })),
        },
      },
    });

    return recalculate(tx, created.id);
  });
}

// Customer QR self-order entry point. Finds the table's current open tab and
// appends to it, or opens a new one attributed to the QR system user.
// Row-locks the table (via the same OCCUPIED update createDraft performs)
// for the whole find-or-create, so two phones submitting for the same table
// at once serialize instead of racing into two separate OPEN transactions.
export async function createOrAppendQrOrder(
  outletId: number,
  tableId: number,
  items: { productId: number; variantId?: number; quantity: number }[],
  systemCashierId: number
) {
  return prisma.$transaction(async (tx) => {
    const table = await tx.table.findFirst({ where: { id: tableId, outletId, deletedAt: null } });
    if (!table) throw ApiError.notFound("Table not found");
    if (table.status === "NOT_AVAILABLE") {
      throw ApiError.badRequest("Table is not available");
    }
    await tx.table.update({ where: { id: tableId }, data: { status: "OCCUPIED" } });

    const existing = await tx.transaction.findFirst({
      where: { tableId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    });

    let transactionId: number;
    if (existing) {
      transactionId = existing.id;
      for (const item of items) {
        await tx.transactionItem.create({
          data: {
            transactionId,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: 0,
            lineTotal: 0,
          },
        });
      }
    } else {
      const created = await tx.transaction.create({
        data: {
          outletId,
          tableId,
          cashierId: systemCashierId,
          status: "OPEN",
          origin: "QR",
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: 0,
              lineTotal: 0,
            })),
          },
        },
      });
      transactionId = created.id;
    }

    return recalculate(tx, transactionId);
  });
}

export async function addItem(transactionId: number, input: AddItemInput) {
  return prisma.$transaction(async (tx) => {
    await ensureMutable(tx, transactionId);
    await tx.transactionItem.create({
      data: {
        transactionId,
        productId: input.productId,
        variantId: input.variantId,
        quantity: input.quantity,
        discountId: input.discountId,
        unitPrice: 0,
        lineTotal: 0,
      },
    });
    return recalculate(tx, transactionId);
  });
}

export async function updateItem(transactionId: number, itemId: number, input: UpdateItemInput) {
  return prisma.$transaction(async (tx) => {
    await ensureMutable(tx, transactionId);
    const item = await tx.transactionItem.findFirst({ where: { id: itemId, transactionId } });
    if (!item) throw ApiError.notFound("Transaction item not found");

    await tx.transactionItem.update({
      where: { id: itemId },
      data: {
        quantity: input.quantity,
        discountId: input.discountId,
      },
    });
    return recalculate(tx, transactionId);
  });
}

export async function removeItem(transactionId: number, itemId: number) {
  return prisma.$transaction(async (tx) => {
    await ensureMutable(tx, transactionId);
    const item = await tx.transactionItem.findFirst({ where: { id: itemId, transactionId } });
    if (!item) throw ApiError.notFound("Transaction item not found");

    await tx.transactionItem.delete({ where: { id: itemId } });
    return recalculate(tx, transactionId);
  });
}

export async function updateTransaction(transactionId: number, input: UpdateTransactionInput) {
  return prisma.$transaction(async (tx) => {
    await ensureMutable(tx, transactionId);
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        customerId: input.customerId,
        tableId: input.tableId,
        orderDiscountId: input.orderDiscountId,
        notes: input.notes,
      },
    });
    return recalculate(tx, transactionId);
  });
}

// Decrements stock for every line item, validating availability first.
// Throws (aborting the surrounding DB transaction) if any item is short.
async function decrementStockForItems(
  tx: Tx,
  outletId: number,
  items: { productId: number; variantId: number | null; quantity: number }[],
  performedByUserId: number
) {
  for (const item of items) {
    const stock = await tx.productStock.findFirst({
      where: { productId: item.productId, variantId: item.variantId, outletId },
    });
    if (!stock || stock.quantity < item.quantity) {
      throw ApiError.conflict("Insufficient stock for one or more items", {
        productId: item.productId,
        variantId: item.variantId,
        available: stock?.quantity ?? 0,
        requested: item.quantity,
      });
    }
    await tx.productStock.update({
      where: { id: stock.id },
      data: { quantity: { decrement: item.quantity } },
    });
    await tx.inventoryMovement.create({
      data: {
        outletId,
        productId: item.productId,
        variantId: item.variantId,
        type: "SALE",
        quantityChange: -item.quantity,
        performedByUserId,
      },
    });
  }
}

function assertPaymentsCoverTotal(payments: { amount: number }[], total: number) {
  const paid = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  if (paid < total) {
    throw ApiError.badRequest(`Payments (${paid}) do not cover the total (${total})`);
  }
}

// Validates every discount actually applied on this transaction (order-level
// and per-line) is still eligible — active, within its date window, under
// its usage limit, meets minimum spend, and (for line discounts) scoped to
// the right product — then bumps each discount's usage count. Runs at
// checkout/finalize time (not on every draft edit) so usage counts only
// reflect completed sales, not abandoned carts.
async function validateAndConsumeDiscounts(tx: Tx, transactionId: number) {
  const transaction = await tx.transaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: {
      items: { include: { discount: true, product: { select: { categoryId: true } } } },
      orderDiscount: true,
    },
  });

  const now = new Date();
  const discounts = new Map<number, { name: string; minSpend: unknown; startDate: Date | null; endDate: Date | null; usageLimit: number | null; usageCount: number; isActive: boolean }>();
  if (transaction.orderDiscount) discounts.set(transaction.orderDiscount.id, transaction.orderDiscount);
  for (const item of transaction.items) {
    if (item.discount) discounts.set(item.discount.id, item.discount);
  }

  for (const discount of discounts.values()) {
    if (!discount.isActive) {
      throw ApiError.badRequest(`Discount "${discount.name}" is no longer active`);
    }
    if (discount.startDate && discount.startDate > now) {
      throw ApiError.badRequest(`Discount "${discount.name}" is not yet active`);
    }
    if (discount.endDate && discount.endDate < now) {
      throw ApiError.badRequest(`Discount "${discount.name}" has expired`);
    }
    if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
      throw ApiError.badRequest(`Discount "${discount.name}" has reached its usage limit`);
    }
    if (discount.minSpend !== null && Number(transaction.subtotal) < Number(discount.minSpend)) {
      throw ApiError.badRequest(`Discount "${discount.name}" requires a minimum spend of ${discount.minSpend}`);
    }
  }

  // Product/category scoping only applies to a discount attached directly
  // to a line item; an order-level discount's scope fields (if set) aren't
  // evaluated against individual lines in v1.
  for (const item of transaction.items) {
    if (item.discount?.productId && item.discount.productId !== item.productId) {
      throw ApiError.badRequest(`Discount "${item.discount.name}" is not valid for this product`);
    }
    if (item.discount?.categoryId && item.discount.categoryId !== item.product.categoryId) {
      throw ApiError.badRequest(`Discount "${item.discount.name}" is not valid for this product's category`);
    }
  }

  for (const id of discounts.keys()) {
    await tx.discount.update({ where: { id }, data: { usageCount: { increment: 1 } } });
  }
}

interface PaymentInput {
  method: "CASH" | "CARD" | "EWALLET" | "GIFT_CARD" | "LOYALTY_POINTS";
  amount: number;
  reference?: string;
  remark?: string;
}

// Creates each payment row, and for the two non-cash-equivalent methods
// debits the backing balance atomically in the same DB transaction:
// GIFT_CARD looks the card up by its code (passed as `reference`) and
// decrements its balance; LOYALTY_POINTS converts the paid amount to points
// via the outlet's redemption rate and decrements the customer's balance.
// Returns the total points redeemed, so the caller can record it.
async function processPayments(
  tx: Tx,
  transactionId: number,
  outletId: number,
  customerId: number | null,
  payments: PaymentInput[]
): Promise<number> {
  let pointsRedeemed = 0;

  for (const p of payments) {
    let giftCardId: number | undefined;

    if (p.method === "GIFT_CARD") {
      if (!p.reference) {
        throw ApiError.badRequest("Gift card payments must include the card code as `reference`");
      }
      const giftCard = await tx.giftCard.findUnique({ where: { code: p.reference } });
      if (!giftCard || !giftCard.isActive) {
        throw ApiError.badRequest("Gift card not found or inactive");
      }
      if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
        throw ApiError.badRequest("Gift card has expired");
      }
      if (Number(giftCard.balance) < p.amount) {
        throw ApiError.badRequest("Gift card balance is insufficient");
      }
      await tx.giftCard.update({ where: { id: giftCard.id }, data: { balance: { decrement: p.amount } } });
      giftCardId = giftCard.id;
    }

    if (p.method === "LOYALTY_POINTS") {
      if (!customerId) {
        throw ApiError.badRequest("Loyalty point redemption requires a customer on the transaction");
      }
      const outlet = await tx.outlet.findUniqueOrThrow({ where: { id: outletId } });
      const redeemRate = Number(outlet.loyaltyRedeemRate) || 0.01;
      const pointsNeeded = Math.ceil(p.amount / redeemRate);
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
      if (customer.pointsBalance < pointsNeeded) {
        throw ApiError.badRequest("Customer does not have enough loyalty points for this redemption");
      }
      await tx.customer.update({ where: { id: customerId }, data: { pointsBalance: { decrement: pointsNeeded } } });
      pointsRedeemed += pointsNeeded;
    }

    await tx.payment.create({
      data: { transactionId, method: p.method, amount: p.amount, reference: p.reference, remark: p.remark, giftCardId },
    });
  }

  return pointsRedeemed;
}

// Accrues loyalty points on the paid total for the transaction's customer,
// using the outlet's configured earn rate. No-op without a customer.
async function accrueLoyaltyPoints(
  tx: Tx,
  outletId: number,
  customerId: number | null,
  total: number
): Promise<number> {
  if (!customerId) return 0;
  const outlet = await tx.outlet.findUniqueOrThrow({ where: { id: outletId } });
  const earnRate = Number(outlet.loyaltyEarnRate) || 0;
  const pointsEarned = Math.floor(total * earnRate);
  if (pointsEarned > 0) {
    await tx.customer.update({ where: { id: customerId }, data: { pointsBalance: { increment: pointsEarned } } });
  }
  return pointsEarned;
}

// Atomically allocates the next receipt number for today, formatted as
// RECYYYYMMDDXXXXXX. The upsert's UPDATE is a single row-locked statement, so
// concurrent checkouts serialize on it instead of racing on a read-then-write.
async function nextReceiptNumber(tx: Tx): Promise<string> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  const sequence = await tx.receiptSequence.upsert({
    where: { date: dateStr },
    create: { date: dateStr, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  return `REC${dateStr}${String(sequence.lastNumber).padStart(6, "0")}`;
}

// Assigns a simulated LHDN e-Invoice at COMPLETED, gated on the outlet
// having a TIN configured (the field a real MyInvois submission requires).
// Outlets that haven't opted in keep behaving exactly as before this feature.
function einvoiceFields(outlet: { einvoiceTin: string | null }) {
  if (!outlet.einvoiceTin) return { einvoiceStatus: "NOT_APPLICABLE" as const };
  const sim = generateSimulatedEInvoice();
  return {
    einvoiceStatus: "GENERATED" as const,
    einvoiceUuid: sim.uuid,
    einvoiceLongId: sim.longId,
    einvoiceGeneratedAt: sim.generatedAt,
  };
}

// One-shot path used by the fast retail checkout screen: create + pay in a
// single atomic operation.
export async function checkout(cashierId: number, input: CheckoutInput) {
  if (input.items.length === 0) {
    throw ApiError.badRequest("Cannot checkout an empty cart");
  }

  return prisma.$transaction(async (tx) => {
    const draftStatus: TransactionStatus = "OPEN";

    const created = await tx.transaction.create({
      data: {
        outletId: input.outletId,
        tableId: input.tableId,
        customerId: input.customerId,
        orderDiscountId: input.orderDiscountId,
        notes: input.notes,
        cashierId,
        status: draftStatus,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            discountId: item.discountId,
            unitPrice: 0,
            lineTotal: 0,
          })),
        },
      },
    });

    const recalculated = await recalculate(tx, created.id);

    assertPaymentsCoverTotal(input.payments, Number(recalculated.total));

    await decrementStockForItems(
      tx,
      input.outletId,
      recalculated.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
      cashierId
    );

    await validateAndConsumeDiscounts(tx, created.id);

    const customerId = input.customerId ?? null;
    const pointsRedeemed = await processPayments(tx, created.id, input.outletId, customerId, input.payments);
    const pointsEarned = await accrueLoyaltyPoints(tx, input.outletId, customerId, Number(recalculated.total));

    if (input.tableId) {
      await tx.table.update({ where: { id: input.tableId }, data: { status: "AVAILABLE" } });
    }

    const receiptNumber = await nextReceiptNumber(tx);

    return tx.transaction.update({
      where: { id: created.id },
      data: { status: "COMPLETED", pointsEarned, pointsRedeemed, receiptNumber, ...einvoiceFields(recalculated.outlet) },
      include: detailInclude,
    });
  });
}

// Finalizes an existing HELD/OPEN transaction (resume-and-pay path).
export async function finalize(transactionId: number, cashierId: number, input: FinalizeInput) {
  return prisma.$transaction(async (tx) => {
    const transaction = await ensureMutable(tx, transactionId);
    const withItems = await tx.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { items: true, outlet: true },
    });

    if (withItems.items.length === 0) {
      throw ApiError.badRequest("Cannot finalize a transaction with no items");
    }

    assertPaymentsCoverTotal(input.payments, Number(withItems.total));

    await decrementStockForItems(
      tx,
      transaction.outletId,
      withItems.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
      cashierId
    );

    await validateAndConsumeDiscounts(tx, transactionId);

    const customerId = withItems.customerId;
    const pointsRedeemed = await processPayments(tx, transactionId, transaction.outletId, customerId, input.payments);
    const pointsEarned = await accrueLoyaltyPoints(tx, transaction.outletId, customerId, Number(withItems.total));

    if (transaction.tableId) {
      await tx.table.update({ where: { id: transaction.tableId }, data: { status: "AVAILABLE" } });
    }

    const receiptNumber = await nextReceiptNumber(tx);

    return tx.transaction.update({
      where: { id: transactionId },
      data: { status: "COMPLETED", pointsEarned, pointsRedeemed, receiptNumber, ...einvoiceFields(withItems.outlet) },
      include: detailInclude,
    });
  });
}

// A cashier can void/refund only with a manager/admin's approval, supplied
// as approverId + approverPassword. Managers/admins may self-approve.
async function resolveApproval(
  tx: Tx,
  actorUserId: number,
  actorRole: string,
  input: VoidInput
): Promise<number> {
  if (actorRole === "ADMIN" || actorRole === "MANAGER") {
    return actorUserId;
  }

  if (!input.approverId || !input.approverPassword) {
    throw ApiError.forbidden("Manager approval (approverId + approverPassword) is required");
  }

  const approver = await tx.user.findFirst({
    where: { id: input.approverId, isActive: true, deletedAt: null, role: { in: ["ADMIN", "MANAGER"] } },
  });
  if (!approver) {
    throw ApiError.forbidden("Approver not found or not authorized");
  }
  const matches = await bcrypt.compare(input.approverPassword, approver.passwordHash);
  if (!matches) {
    throw ApiError.forbidden("Approver credentials invalid");
  }
  return approver.id;
}

async function restockItems(
  tx: Tx,
  outletId: number,
  items: { productId: number; variantId: number | null; quantity: number }[],
  performedByUserId: number
) {
  for (const item of items) {
    const existingStock = await tx.productStock.findFirst({
      where: { productId: item.productId, variantId: item.variantId, outletId },
    });
    if (existingStock) {
      await tx.productStock.update({
        where: { id: existingStock.id },
        data: { quantity: { increment: item.quantity } },
      });
    } else {
      await tx.productStock.create({
        data: { productId: item.productId, variantId: item.variantId, outletId, quantity: item.quantity },
      });
    }
    await tx.inventoryMovement.create({
      data: {
        outletId,
        productId: item.productId,
        variantId: item.variantId,
        type: "REFUND",
        quantityChange: item.quantity,
        performedByUserId,
      },
    });
  }
}

export async function voidTransaction(
  transactionId: number,
  actorUserId: number,
  actorRole: string,
  input: VoidInput
) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { items: true },
    });

    if (transaction.status === "VOIDED" || transaction.status === "REFUNDED") {
      throw ApiError.badRequest("Transaction is already voided/refunded");
    }

    const approvedByUserId = await resolveApproval(tx, actorUserId, actorRole, input);

    // Stock was only decremented once the transaction reached COMPLETED.
    if (transaction.status === "COMPLETED") {
      await restockItems(
        tx,
        transaction.outletId,
        transaction.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        actorUserId
      );
    } else if (transaction.tableId) {
      await tx.table.update({ where: { id: transaction.tableId }, data: { status: "AVAILABLE" } });
    }

    // Mirrors real MyInvois behavior: a cancellation, not a data wipe — the
    // uuid/longId/generatedAt stay intact for audit purposes.
    const einvoiceCancel = transaction.einvoiceStatus === "GENERATED" ? { einvoiceStatus: "CANCELLED" as const } : {};

    const updated = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: "VOIDED",
        voidReason: input.reason,
        voidedAt: new Date(),
        voidedByUserId: actorUserId,
        approvedByUserId,
        ...einvoiceCancel,
      },
      include: detailInclude,
    });

    await recordAudit(tx, {
      userId: actorUserId,
      action: "VOID_TRANSACTION",
      entityType: "Transaction",
      entityId: transactionId,
      outletId: transaction.outletId,
      details: { reason: input.reason, approvedByUserId },
    });

    return updated;
  });
}

export async function refundTransaction(
  transactionId: number,
  actorUserId: number,
  actorRole: string,
  input: VoidInput
) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { items: true },
    });

    if (transaction.status !== "COMPLETED") {
      throw ApiError.badRequest("Only completed transactions can be refunded");
    }

    const approvedByUserId = await resolveApproval(tx, actorUserId, actorRole, input);

    await restockItems(
      tx,
      transaction.outletId,
      transaction.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
      actorUserId
    );

    const einvoiceCancel = transaction.einvoiceStatus === "GENERATED" ? { einvoiceStatus: "CANCELLED" as const } : {};

    const updated = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: "REFUNDED",
        voidReason: input.reason,
        voidedAt: new Date(),
        voidedByUserId: actorUserId,
        approvedByUserId,
        ...einvoiceCancel,
      },
      include: detailInclude,
    });

    await recordAudit(tx, {
      userId: actorUserId,
      action: "REFUND_TRANSACTION",
      entityType: "Transaction",
      entityId: transactionId,
      outletId: transaction.outletId,
      details: { reason: input.reason, approvedByUserId },
    });

    return updated;
  });
}

export async function getTransaction(id: number) {
  const transaction = await prisma.transaction.findUnique({ where: { id }, include: detailInclude });
  if (!transaction) throw ApiError.notFound("Transaction not found");
  return transaction;
}

export async function listTransactions(query: ListQuery) {
  const where: Prisma.TransactionWhereInput = {
    outletId: query.outletId,
    cashierId: query.cashierId,
    status: query.status,
    ...(query.paymentMethod ? { payments: { some: { method: query.paymentMethod } } } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          },
        }
      : {}),
  };

  return prisma.transaction.findMany({
    where,
    include: {
      cashier: { select: { id: true, name: true } },
      table: true,
      customer: true,
      payments: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
