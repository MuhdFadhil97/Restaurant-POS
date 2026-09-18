import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateTableInput, SaveLayoutInput, UpdateTableInput } from "./validation";

export async function listTables(outletId: number) {
  return prisma.table.findMany({
    where: { outletId, deletedAt: null },
    orderBy: { name: "asc" },
  });
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

export async function deleteTable(id: number) {
  const existing = await prisma.table.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Table not found");
  await prisma.table.update({ where: { id }, data: { deletedAt: new Date() } });
}
