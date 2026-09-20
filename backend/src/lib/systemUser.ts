import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "./prisma";

const SYSTEM_USERNAME = "qr_system";

let cachedId: number | null = null;

// Every QR self-order needs a `cashierId` to satisfy Transaction's required
// FK, but no staff member placed it. Resolves (creating on first use) one
// global sentinel User so cashier-grouped reports keep working unmodified —
// its role is excluded from the Users module's schema, so staff can never
// create/assign it, and its password hash is unusable (random, discarded).
export async function getOrCreateSystemUserId(): Promise<number> {
  if (cachedId !== null) return cachedId;

  const existing = await prisma.user.findFirst({ where: { username: SYSTEM_USERNAME } });
  if (existing) {
    cachedId = existing.id;
    return existing.id;
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const created = await prisma.user.create({
    data: {
      email: "qr-system@pos.local",
      username: SYSTEM_USERNAME,
      passwordHash,
      name: "QR Self-Order",
      role: "SYSTEM",
      isActive: true,
    },
  });
  cachedId = created.id;
  return created.id;
}
