import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateTableInput, SaveLayoutInput, UpdateTableInput } from "./validation";

export async function listTables(outletId: number) {
  const tables = await prisma.table.findMany({
    where: { outletId, deletedAt: null },
    include: { transactions: { where: { status: "OPEN" }, take: 1, select: { id: true, origin: true } } },
    orderBy: { name: "asc" },
  });
  return tables.map(({ transactions, ...table }) => ({
    ...table,
    activeOrder: transactions[0] ?? null,
  }));
}

export async function createTable(input: CreateTableInput) {
  return prisma.table.create({ data: input });
}

export async function updateTable(id: number, input: UpdateTableInput) {
  const existing = await prisma.table.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Table not found");

  const data: Prisma.TableUpdateInput = { ...input };
  if (input.status && input.status !== "RESERVED") {
    data.reservedFor = null;
    data.reservedAt = null;
    data.reservedPartySize = null;
  }
  return prisma.table.update({ where: { id }, data });
}

export async function saveLayout(outletId: number, tables: SaveLayoutInput["tables"]) {
  const ids = tables.map((t) => t.id);
  const owned = await prisma.table.findMany({
    where: { id: { in: ids }, outletId, deletedAt: null },
    select: { id: true },
  });
  if (owned.length !== ids.length) {
    throw ApiError.badRequest("One or more tables do not belong to this outlet");
  }

  return prisma.$transaction(
    tables.map((t) =>
      prisma.table.update({
        where: { id: t.id },
        data: { posX: t.posX, posY: t.posY, shape: t.shape, width: t.width, height: t.height },
      })
    )
  );
}

// Generates (or rotates) the table's QR self-order token. Serves both the
// first "Generate" click and a later "Regenerate" — regenerating overwrites
// the column, so the old QR immediately stops resolving.
export async function generateQrToken(id: number) {
  const existing = await prisma.table.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Table not found");

  for (let attempt = 0; attempt < 5; attempt++) {
    const qrToken = crypto.randomBytes(18).toString("base64url");
    try {
      return await prisma.table.update({
        where: { id },
        data: { qrToken, qrTokenRotatedAt: new Date() },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
  throw ApiError.conflict("Could not generate a unique QR token, please try again");
}

export async function deleteTable(id: number) {
  const existing = await prisma.table.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Table not found");
  await prisma.table.update({ where: { id }, data: { deletedAt: new Date() } });
}
