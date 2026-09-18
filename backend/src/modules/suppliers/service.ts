import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateSupplierInput, UpdateSupplierInput } from "./validation";

export async function listSuppliers() {
  return prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
}

export async function getSupplier(id: number) {
  const supplier = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!supplier) throw ApiError.notFound("Supplier not found");
  return supplier;
}

export async function createSupplier(input: CreateSupplierInput) {
  return prisma.supplier.create({ data: input });
}

export async function updateSupplier(id: number, input: UpdateSupplierInput) {
  await getSupplier(id);
  return prisma.supplier.update({ where: { id }, data: input });
}

export async function deleteSupplier(id: number) {
  await getSupplier(id);
  await prisma.supplier.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}
