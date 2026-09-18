import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateCategoryInput, UpdateCategoryInput } from "./validation";

export async function listCategories() {
  return prisma.productCategory.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
}

export async function getCategory(id: string) {
  const category = await prisma.productCategory.findFirst({ where: { id, deletedAt: null } });
  if (!category) throw ApiError.notFound("Category not found");
  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  return prisma.productCategory.create({ data: input });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  await getCategory(id);
  return prisma.productCategory.update({ where: { id }, data: input });
}

export async function deleteCategory(id: string) {
  await getCategory(id);
  await prisma.productCategory.update({ where: { id }, data: { deletedAt: new Date() } });
}
