import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import {
  CancelReservationInput,
  CreatePublicReservationInput,
  CreateReservationInput,
  ListReservationsQuery,
  SeatReservationInput,
  UpdateReservationInput,
} from "./validation";

const detailInclude = {
  table: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.ReservationInclude;

async function findOrThrow(id: number) {
  const reservation = await prisma.reservation.findUnique({ where: { id }, include: detailInclude });
  if (!reservation) throw ApiError.notFound("Reservation not found");
  return reservation;
}

// Mirrors tables/service.ts's own "clear reserved* together" rule: the
// Table.reserved* columns are a lightweight floor-plan preview of whichever
// reservation currently holds that table, kept in sync here rather than
// requiring the floor plan to join against Reservation.
async function syncTableReservedPreview(
  tx: Prisma.TransactionClient,
  tableId: number,
  preview: { reservedFor: string; reservedAt: Date; reservedPartySize: number } | null
) {
  await tx.table.update({
    where: { id: tableId },
    data: preview
      ? { status: "RESERVED", reservedFor: preview.reservedFor, reservedAt: preview.reservedAt, reservedPartySize: preview.reservedPartySize }
      : { status: "AVAILABLE", reservedFor: null, reservedAt: null, reservedPartySize: null },
  });
}

export async function listReservations(query: ListReservationsQuery) {
  const where: Prisma.ReservationWhereInput = { outletId: query.outletId };
  if (query.status) where.status = query.status;
  if (query.dateFrom || query.dateTo) {
    where.reservedFor = {
      ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00`) } : {}),
      ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999`) } : {}),
    };
  }
  return prisma.reservation.findMany({ where, include: detailInclude, orderBy: { reservedFor: "asc" } });
}

export async function getReservation(id: number) {
  return findOrThrow(id);
}

// Staff-initiated bookings start CONFIRMED — a staff member is taking the
// call directly, so there's no separate review step.
export async function createReservation(input: CreateReservationInput) {
  return prisma.$transaction(async (tx) => {
    if (input.tableId) {
      const table = await tx.table.findFirst({ where: { id: input.tableId, outletId: input.outletId, deletedAt: null } });
      if (!table) throw ApiError.notFound("Table not found");
    }

    const reservation = await tx.reservation.create({
      data: {
        outletId: input.outletId,
        tableId: input.tableId,
        customerName: input.customerName,
        phone: input.phone,
        partySize: input.partySize,
        reservedFor: input.reservedFor,
        durationMinutes: input.durationMinutes,
        depositAmount: input.depositAmount,
        notes: input.notes,
        status: "CONFIRMED",
        source: "STAFF",
      },
      include: detailInclude,
    });

    if (input.tableId) {
      await syncTableReservedPreview(tx, input.tableId, {
        reservedFor: input.customerName,
        reservedAt: input.reservedFor,
        reservedPartySize: input.partySize,
      });
    }

    return reservation;
  });
}

// Public/guest booking — always PENDING; no table assignment or deposit
// until staff review and confirm it.
export async function createPublicReservation(outletId: number, input: CreatePublicReservationInput) {
  const outlet = await prisma.outlet.findFirst({ where: { id: outletId, isActive: true } });
  if (!outlet) throw ApiError.notFound("Outlet not found");

  return prisma.reservation.create({
    data: {
      outletId,
      customerName: input.customerName,
      phone: input.phone,
      partySize: input.partySize,
      reservedFor: input.reservedFor,
      notes: input.notes,
      status: "PENDING",
      source: "ONLINE",
    },
    include: detailInclude,
  });
}

export async function updateReservation(id: number, input: UpdateReservationInput) {
  const existing = await findOrThrow(id);
  if (existing.status !== "PENDING" && existing.status !== "CONFIRMED") {
    throw ApiError.badRequest(`Cannot edit a reservation with status ${existing.status}`);
  }
  return prisma.reservation.update({
    where: { id },
    data: {
      tableId: input.tableId,
      customerName: input.customerName,
      phone: input.phone,
      partySize: input.partySize,
      reservedFor: input.reservedFor,
      durationMinutes: input.durationMinutes,
      depositAmount: input.depositAmount,
      notes: input.notes,
    },
    include: detailInclude,
  });
}

function assertTransition(current: ReservationStatus, allowed: ReservationStatus[]) {
  if (!allowed.includes(current)) {
    throw ApiError.badRequest(`Cannot transition a reservation from ${current}`);
  }
}

export async function confirmReservation(id: number, tableId?: number) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.reservation.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Reservation not found");
    assertTransition(existing.status, ["PENDING"]);

    const assignedTableId = tableId ?? existing.tableId ?? undefined;
    if (assignedTableId) {
      const table = await tx.table.findFirst({ where: { id: assignedTableId, outletId: existing.outletId, deletedAt: null } });
      if (!table) throw ApiError.notFound("Table not found");
    }

    const reservation = await tx.reservation.update({
      where: { id },
      data: { status: "CONFIRMED", tableId: assignedTableId },
      include: detailInclude,
    });

    if (assignedTableId) {
      await syncTableReservedPreview(tx, assignedTableId, {
        reservedFor: reservation.customerName,
        reservedAt: reservation.reservedFor,
        reservedPartySize: reservation.partySize,
      });
    }

    return reservation;
  });
}

// Seating flips the table straight to OCCUPIED (clearing the reserved*
// preview) and leaves opening an actual order tab to the normal POS
// table-tap flow (transactions/service.ts createDraft) — seating and
// starting a tab are different staff actions here, not one step.
export async function seatReservation(id: number, input: SeatReservationInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.reservation.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Reservation not found");
    assertTransition(existing.status, ["CONFIRMED"]);

    const tableId = input.tableId ?? existing.tableId;
    if (!tableId) throw ApiError.badRequest("A table must be assigned before seating");

    const table = await tx.table.findFirst({ where: { id: tableId, outletId: existing.outletId, deletedAt: null } });
    if (!table) throw ApiError.notFound("Table not found");
    if (table.status === "NOT_AVAILABLE") throw ApiError.badRequest("Table is not available");

    await tx.table.update({
      where: { id: tableId },
      data: { status: "OCCUPIED", reservedFor: null, reservedAt: null, reservedPartySize: null },
    });

    return tx.reservation.update({
      where: { id },
      data: { status: "SEATED", tableId },
      include: detailInclude,
    });
  });
}

export async function completeReservation(id: number) {
  const existing = await findOrThrow(id);
  assertTransition(existing.status, ["SEATED"]);
  return prisma.reservation.update({ where: { id }, data: { status: "COMPLETED" }, include: detailInclude });
}

async function releaseTableIfHeldBy(tx: Prisma.TransactionClient, reservation: { tableId: number | null; status: ReservationStatus }) {
  if (!reservation.tableId || reservation.status === "SEATED" || reservation.status === "COMPLETED") return;
  const table = await tx.table.findUnique({ where: { id: reservation.tableId } });
  if (table && table.status === "RESERVED") {
    await tx.table.update({ where: { id: reservation.tableId }, data: { status: "AVAILABLE", reservedFor: null, reservedAt: null, reservedPartySize: null } });
  }
}

export async function cancelReservation(id: number, input: CancelReservationInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.reservation.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Reservation not found");
    assertTransition(existing.status, ["PENDING", "CONFIRMED"]);

    await releaseTableIfHeldBy(tx, existing);

    return tx.reservation.update({
      where: { id },
      data: { status: "CANCELLED", cancelledReason: input.reason },
      include: detailInclude,
    });
  });
}

export async function markNoShow(id: number) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.reservation.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Reservation not found");
    assertTransition(existing.status, ["CONFIRMED"]);

    await releaseTableIfHeldBy(tx, existing);

    return tx.reservation.update({ where: { id }, data: { status: "NO_SHOW" }, include: detailInclude });
  });
}

export async function collectDeposit(id: number, amount: number) {
  const existing = await findOrThrow(id);
  if (existing.status === "CANCELLED" || existing.status === "NO_SHOW") {
    throw ApiError.badRequest(`Cannot collect a deposit on a ${existing.status} reservation`);
  }
  return prisma.reservation.update({
    where: { id },
    data: { depositAmount: amount, depositCollectedAt: new Date() },
    include: detailInclude,
  });
}
