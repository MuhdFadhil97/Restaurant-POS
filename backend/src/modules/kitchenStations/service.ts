import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateStationInput, UpdateStationInput } from "./validation";

export async function listStations(outletId: number) {
  return prisma.kitchenStation.findMany({
    where: { outletId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function createStation(input: CreateStationInput) {
  return prisma.kitchenStation.create({ data: input });
}

export async function updateStation(id: number, input: UpdateStationInput) {
  const existing = await prisma.kitchenStation.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Kitchen station not found");
  return prisma.kitchenStation.update({ where: { id }, data: input });
}

export async function deleteStation(id: number) {
  const existing = await prisma.kitchenStation.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Kitchen station not found");
  await prisma.kitchenStation.update({ where: { id }, data: { deletedAt: new Date() } });
}
