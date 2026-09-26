import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { getEffectiveModules } from "../../lib/modules";
import { issuePasswordResetLink } from "../auth/passwordReset";
import { CreateUserInput, UpdateUserInput } from "./validation";

const SALT_ROUNDS = 10;

function toDto(user: {
  id: number;
  email: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
  moduleAccessCustomized: boolean;
  outletAccess: { outletId: number }[];
  moduleAccess: { moduleKey: string }[];
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    outletIds: user.outletAccess.map((a) => a.outletId),
    moduleAccess: getEffectiveModules(
      user.role,
      user.moduleAccessCustomized,
      user.moduleAccess.map((m) => m.moduleKey)
    ),
  };
}

const INCLUDE_ACCESS = {
  outletAccess: { select: { outletId: true } },
  moduleAccess: { select: { moduleKey: true } },
} as const;

export async function listUsers() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: INCLUDE_ACCESS,
    orderBy: { name: "asc" },
  });
  return users.map(toDto);
}

export async function getUser(id: number) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: INCLUDE_ACCESS,
  });
  if (!user) throw ApiError.notFound("User not found");
  return toDto(user);
}

export async function createUser(input: CreateUserInput) {
  // No password given = invite: the account gets an unguessable random
  // password no one is ever told, and the user is emailed a link to set
  // their own instead of the admin choosing one for them.
  const isInvite = !input.password;
  const passwordHash = await bcrypt.hash(input.password ?? crypto.randomBytes(32).toString("hex"), SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      name: input.name,
      role: input.role,
      outletAccess: { create: input.outletIds.map((outletId) => ({ outletId })) },
      ...(input.moduleAccess
        ? {
            moduleAccessCustomized: true,
            moduleAccess: { create: input.moduleAccess.map((moduleKey) => ({ moduleKey })) },
          }
        : {}),
    },
    include: INCLUDE_ACCESS,
  });
  if (isInvite) {
    await issuePasswordResetLink(user.id, user.email, user.name, "invite");
  }
  return toDto(user);
}

export async function updateUser(id: number, input: UpdateUserInput, actorUserId: number) {
  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("User not found");

  const { password, outletIds, moduleAccess, ...rest } = input;
  const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : undefined;

  // Changes that alter what a user is allowed to do, or who can authenticate
  // as them, must take effect immediately rather than waiting for their
  // current JWT to expire — bump tokenVersion so any live session is forced
  // to re-login and pick up the change.
  const revokesSession =
    passwordHash !== undefined ||
    (rest.role && rest.role !== existing.role) ||
    moduleAccess !== undefined ||
    rest.isActive === false;

  const user = await prisma.$transaction(async (tx) => {
    if (outletIds) {
      await tx.userOutlet.deleteMany({ where: { userId: id } });
      await tx.userOutlet.createMany({
        data: outletIds.map((outletId) => ({ userId: id, outletId })),
      });
    }
    if (moduleAccess) {
      await tx.userModuleAccess.deleteMany({ where: { userId: id } });
      await tx.userModuleAccess.createMany({
        data: moduleAccess.map((moduleKey) => ({ userId: id, moduleKey })),
      });
    }
    const updated = await tx.user.update({
      where: { id },
      data: {
        ...rest,
        ...(passwordHash ? { passwordHash } : {}),
        ...(moduleAccess ? { moduleAccessCustomized: true } : {}),
        ...(revokesSession ? { tokenVersion: { increment: 1 } } : {}),
      },
      include: INCLUDE_ACCESS,
    });

    if (rest.role && rest.role !== existing.role) {
      await recordAudit(tx, {
        userId: actorUserId,
        action: "USER_ROLE_CHANGED",
        entityType: "User",
        entityId: id,
        details: { from: existing.role, to: rest.role },
      });
    }
    if (passwordHash) {
      await recordAudit(tx, {
        userId: actorUserId,
        action: "USER_PASSWORD_CHANGED",
        entityType: "User",
        entityId: id,
        details: { changedByAdmin: actorUserId !== id },
      });
    }
    if (outletIds) {
      await recordAudit(tx, {
        userId: actorUserId,
        action: "USER_OUTLET_ACCESS_CHANGED",
        entityType: "User",
        entityId: id,
        details: { outletIds },
      });
    }
    if (moduleAccess) {
      await recordAudit(tx, {
        userId: actorUserId,
        action: "USER_MODULE_ACCESS_CHANGED",
        entityType: "User",
        entityId: id,
        details: { moduleAccess },
      });
    }

    return updated;
  });

  return toDto(user);
}

// Admin-triggered: (re)sends a set/reset-password link. Works for a brand
// new invite that never landed, or any existing user who's locked out —
// same underlying mechanism as self-service "forgot password".
export async function sendPasswordResetLink(id: number) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw ApiError.notFound("User not found");
  await issuePasswordResetLink(user.id, user.email, user.name, "reset");
}

// Force-logout: invalidates every JWT already issued to this user without
// changing any other field. Used e.g. when a device is lost/stolen or a
// staff member's access needs to be cut off immediately.
export async function revokeSessions(id: number, actorUserId: number) {
  await getUser(id);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
    await recordAudit(tx, {
      userId: actorUserId,
      action: "USER_SESSIONS_REVOKED",
      entityType: "User",
      entityId: id,
    });
  });
}

export async function deleteUser(id: number) {
  await getUser(id);
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}
