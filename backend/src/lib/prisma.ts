import { PrismaClient } from "@prisma/client";

// Reuse a single client across hot-reloads in dev to avoid exhausting
// Postgres connections.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Prisma's 5s default aborted production checkouts that briefly waited on
    // a stock-row lock held by another sale. Give interactive transactions
    // more headroom so a short lock wait doesn't fail (and roll back) a sale.
    transactionOptions: { maxWait: 5000, timeout: 15000 },
  });

if (process.env.NODE_ENV === "development") {
  global.__prisma = prisma;
}
