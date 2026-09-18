import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateOutletInput, UpdateOutletInput } from "./validation";

export async function listOutlets(userId: string, isAdmin: boolean) {
  if (isAdmin) {
    return prisma.outlet.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  }
  return prisma.outlet.findMany({
    where: { deletedAt: null, userAccess: { some: { userId } } },
    orderBy: { name: "asc" },
  });
}

export async function getOutlet(id: string) {
  const outlet = await prisma.outlet.findFirst({ where: { id, deletedAt: null } });
  if (!outlet) throw ApiError.notFound("Outlet not found");
  return outlet;
}

export async function createOutlet(input: CreateOutletInput) {
  return prisma.outlet.create({ data: input });
}

export async function updateOutlet(id: string, input: UpdateOutletInput) {
  await getOutlet(id);
  return prisma.outlet.update({ where: { id }, data: input });
}

export async function deleteOutlet(id: string) {
  await getOutlet(id);
  await prisma.outlet.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}
