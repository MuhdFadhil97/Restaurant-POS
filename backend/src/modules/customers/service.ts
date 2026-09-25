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

export async function getCustomer(id: number) {
  const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
  if (!customer) throw ApiError.notFound("Customer not found");
  return customer;
}

export async function getCustomerHistory(id: number) {
  await getCustomer(id);
  return prisma.transaction.findMany({
    where: { customerId: id, status: { in: ["COMPLETED", "REFUNDED"] } },
    include: { items: { include: { product: true } }, payments: true },
    orderBy: { createdAt: "desc" },
  });
}

// marketingConsentAt tracks when consent was actually granted (PDPA
// audit trail), so it's derived here rather than accepted from the client.
function withConsentTimestamp<T extends { marketingConsent?: boolean }>(input: T) {
  if (input.marketingConsent === undefined) return input;
  return { ...input, marketingConsentAt: input.marketingConsent ? new Date() : null };
}

export async function createCustomer(input: CreateCustomerInput) {
  return prisma.customer.create({ data: withConsentTimestamp(input) });
}

export async function updateCustomer(id: number, input: UpdateCustomerInput) {
  await getCustomer(id);
  return prisma.customer.update({ where: { id }, data: withConsentTimestamp(input) });
}

export async function deleteCustomer(id: number) {
  await getCustomer(id);
  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
}
