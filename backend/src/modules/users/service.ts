import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { recordAudit } from "../../lib/audit";
import { CreateUserInput, UpdateUserInput } from "./validation";

const SALT_ROUNDS = 10;

function toDto(user: {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  outletAccess: { outletId: string }[];
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    outletIds: user.outletAccess.map((a) => a.outletId),
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { outletAccess: { select: { outletId: true } } },
    orderBy: { name: "asc" },
  });
  return users.map(toDto);
}

export async function getUser(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: { outletAccess: { select: { outletId: true } } },
  });
  if (!user) throw ApiError.notFound("User not found");
  return toDto(user);
}

export async function createUser(input: CreateUserInput) {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      name: input.name,
      role: input.role,
      outletAccess: { create: input.outletIds.map((outletId) => ({ outletId })) },
    },
    include: { outletAccess: { select: { outletId: true } } },
  });
  return toDto(user);
}

export async function updateUser(id: string, input: UpdateUserInput, actorUserId: string) {
  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("User not found");

  const { password, outletIds, ...rest } = input;
  const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : undefined;

  const user = await prisma.$transaction(async (tx) => {
    if (outletIds) {
      await tx.userOutlet.deleteMany({ where: { userId: id } });
      await tx.userOutlet.createMany({
        data: outletIds.map((outletId) => ({ userId: id, outletId })),
      });
    }
    const updated = await tx.user.update({
      where: { id },
      data: { ...rest, ...(passwordHash ? { passwordHash } : {}) },
      include: { outletAccess: { select: { outletId: true } } },
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

    return updated;
  });

  return toDto(user);
}

export async function deleteUser(id: string) {
  await getUser(id);
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}
