import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateStationInput, UpdateStationInput } from "./validation";

const include = { printer: { select: { id: true, name: true, lastStatus: true } } };

async function assertStationPrinter(outletId: number, printerId: number | null | undefined) {
  if (printerId == null) return;
  const printer = await prisma.printer.findFirst({ where: { id: printerId, outletId, deletedAt: null } });
  if (!printer) throw ApiError.badRequest("Printer must belong to the same outlet");
}

export async function listStations(outletId: number) {
  return prisma.kitchenStation.findMany({
    where: { outletId, deletedAt: null },
    include,
    orderBy: { name: "asc" },
  });
}

export async function createStation(input: CreateStationInput) {
  await assertStationPrinter(input.outletId, input.printerId);
  return prisma.kitchenStation.create({ data: input, include });
}

export async function updateStation(id: number, input: UpdateStationInput) {
  const existing = await prisma.kitchenStation.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Kitchen station not found");
  await assertStationPrinter(existing.outletId, input.printerId);
  return prisma.kitchenStation.update({ where: { id }, data: input, include });
}

export async function deleteStation(id: number) {
  const existing = await prisma.kitchenStation.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Kitchen station not found");
  await prisma.kitchenStation.update({ where: { id }, data: { deletedAt: new Date() } });
}
