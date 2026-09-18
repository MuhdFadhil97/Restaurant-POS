import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { LoginInput } from "./validation";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [{ email: input.identifier }, { username: input.identifier }],
    },
    include: { outletAccess: { select: { outletId: true } } },
  });

  // No matching account — nothing to attribute a lockout/audit row to, and
  // revealing whether the identifier exists would be an enumeration leak.
  if (!user) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw ApiError.locked(
      `Account locked until ${user.lockedUntil.toISOString()} after too many failed attempts`
    );
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const locking = failedLoginAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: locking ? 0 : failedLoginAttempts,
          lockedUntil: locking ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
        },
      });
      await recordAudit(tx, {
        userId: user.id,
        action: locking ? "ACCOUNT_LOCKED" : "LOGIN_FAILURE",
        entityType: "User",
        entityId: user.id,
        details: { failedLoginAttempts },
      });
    });

    if (locking) {
      throw ApiError.locked("Account locked for 15 minutes after too many failed attempts");
    }
    throw ApiError.unauthorized("Invalid credentials");
  }

  const outletIds = user.outletAccess.map((a) => a.outletId);
  const token = signToken({ userId: user.id, role: user.role, outletIds });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    await recordAudit(tx, {
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entityType: "User",
      entityId: user.id,
    });
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      outletIds,
    },
  };
}

export async function getCurrentUser(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { outletAccess: { select: { outletId: true } } },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    outletIds: user.outletAccess.map((a) => a.outletId),
  };
}
