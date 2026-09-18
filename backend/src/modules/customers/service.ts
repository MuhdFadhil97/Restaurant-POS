import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { CreateCustomerInput, UpdateCustomerInput } from "./validation";

export async function listCustomers(search?: string) {
  return prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
  if (!customer) throw ApiError.notFound("Customer not found");
  return customer;
}

export async function getCustomerHistory(id: string) {
  await getCustomer(id);
  return prisma.transaction.findMany({
    where: { customerId: id, status: { in: ["COMPLETED", "REFUNDED"] } },
    include: { items: { include: { product: true } }, payments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCustomer(input: CreateCustomerInput) {
  return prisma.customer.create({ data: input });
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  await getCustomer(id);
  return prisma.customer.update({ where: { id }, data: input });
}

export async function deleteCustomer(id: string) {
  await getCustomer(id);
  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
}
