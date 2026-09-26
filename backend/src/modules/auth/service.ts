import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { getEffectiveModules } from "../../lib/modules";
import { consumePasswordResetToken, issuePasswordResetLink } from "./passwordReset";
import { ForgotPasswordInput, LoginInput, ResetPasswordInput } from "./validation";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const SALT_ROUNDS = 10;

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [{ email: input.identifier }, { username: input.identifier }],
    },
    include: {
      outletAccess: { select: { outletId: true } },
      moduleAccess: { select: { moduleKey: true } },
    },
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
  const modules = getEffectiveModules(
    user.role,
    user.moduleAccessCustomized,
    user.moduleAccess.map((m) => m.moduleKey)
  );
  const token = signToken({
    userId: user.id,
    role: user.role,
    outletIds,
    modules,
    tokenVersion: user.tokenVersion,
  });

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
      modules,
    },
  };
}

// Always succeeds from the caller's perspective, whether or not the
// identifier matches an account — revealing that would be an enumeration
// leak (same reasoning as login's "Invalid credentials" message).
export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [{ email: input.identifier }, { username: input.identifier }],
    },
  });
  if (!user) return;
  await issuePasswordResetLink(user.id, user.email, user.name, "reset");
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  await consumePasswordResetToken(input.token, passwordHash);
}

export async function getCurrentUser(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      outletAccess: { select: { outletId: true } },
      moduleAccess: { select: { moduleKey: true } },
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    outletIds: user.outletAccess.map((a) => a.outletId),
    modules: getEffectiveModules(
      user.role,
      user.moduleAccessCustomized,
      user.moduleAccess.map((m) => m.moduleKey)
    ),
  };
}
