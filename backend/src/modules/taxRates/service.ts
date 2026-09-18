import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateTaxRateInput, UpdateTaxRateInput } from "./validation";

export async function listTaxRates(outletId: number) {
  return prisma.taxRate.findMany({ where: { outletId }, orderBy: { name: "asc" } });
}

export async function createTaxRate(input: CreateTaxRateInput) {
  if (input.isDefault) {
    await prisma.taxRate.updateMany({ where: { outletId: input.outletId }, data: { isDefault: false } });
  }
  return prisma.taxRate.create({ data: input });
}

export async function updateTaxRate(id: number, input: UpdateTaxRateInput) {
  const existing = await prisma.taxRate.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Tax rate not found");

  if (input.isDefault) {
    await prisma.taxRate.updateMany({
      where: { outletId: existing.outletId, id: { not: id } },
      data: { isDefault: false },
    });
  }
  return prisma.taxRate.update({ where: { id }, data: input });
}

export async function deleteTaxRate(id: number) {
  const existing = await prisma.taxRate.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Tax rate not found");
  await prisma.taxRate.delete({ where: { id } });
}
