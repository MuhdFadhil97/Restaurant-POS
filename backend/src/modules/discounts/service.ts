import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateDiscountInput, UpdateDiscountInput } from "./validation";

// Cast to the "unchecked" input variant (scalar FKs like `productId`,
// rather than nested `product: { connect }`) since that's the shape these
// plain DTOs are already in.
function toPrismaData(
  input: CreateDiscountInput | UpdateDiscountInput
): Prisma.DiscountUncheckedCreateInput {
  const { startDate, endDate, ...rest } = input;
  return {
    ...rest,
    ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
    ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
  } as Prisma.DiscountUncheckedCreateInput;
}

export async function listDiscounts() {
  return prisma.discount.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function createDiscount(input: CreateDiscountInput) {
  return prisma.discount.create({ data: toPrismaData(input) });
}

export async function updateDiscount(id: string, input: UpdateDiscountInput) {
  const existing = await prisma.discount.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Discount not found");
  return prisma.discount.update({ where: { id }, data: toPrismaData(input) });
}

export async function deleteDiscount(id: string) {
  const existing = await prisma.discount.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Discount not found");
  await prisma.discount.update({ where: { id }, data: { isActive: false } });
}
