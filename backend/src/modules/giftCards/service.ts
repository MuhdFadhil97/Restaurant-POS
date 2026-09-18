import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { AdjustGiftCardInput, CreateGiftCardInput } from "./validation";

function generateCode(): string {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

export async function listGiftCards() {
  return prisma.giftCard.findMany({ orderBy: { issuedAt: "desc" } });
}

export async function getGiftCardByCode(code: string) {
  const giftCard = await prisma.giftCard.findUnique({ where: { code } });
  if (!giftCard) throw ApiError.notFound("Gift card not found");
  return giftCard;
}

export async function createGiftCard(input: CreateGiftCardInput) {
  const code = input.code ?? generateCode();
  return prisma.giftCard.create({
    data: {
      code,
      balance: input.balance,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    },
  });
}

export async function adjustGiftCard(id: number, input: AdjustGiftCardInput) {
  const existing = await prisma.giftCard.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Gift card not found");
  return prisma.giftCard.update({ where: { id }, data: input });
}
