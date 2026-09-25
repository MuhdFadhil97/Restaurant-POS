import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { encryptSecret } from "../../lib/crypto";
import { CreatePlatformInput, UpdatePlatformInput } from "./validation";

// Never send apiKeyEncrypted/webhookSecretEncrypted to the frontend — staff
// only need to know a secret is configured, not read it back.
function withHasSecrets<T extends { apiKeyEncrypted?: string | null; webhookSecretEncrypted?: string | null }>(
  platform: T
) {
  const { apiKeyEncrypted, webhookSecretEncrypted, ...rest } = platform;
  return { ...rest, hasApiKey: !!apiKeyEncrypted, hasWebhookSecret: !!webhookSecretEncrypted };
}

export async function listPlatforms(outletId: number) {
  const platforms = await prisma.deliveryPlatform.findMany({
    where: { outletId, deletedAt: null },
    orderBy: { name: "asc" },
  });
  return platforms.map(withHasSecrets);
}

export async function createPlatform(input: CreatePlatformInput) {
  const platform = await prisma.deliveryPlatform.create({
    data: {
      outletId: input.outletId,
      provider: input.provider,
      name: input.name,
      autoAccept: input.autoAccept ?? false,
      apiKeyEncrypted: input.apiKey ? encryptSecret(input.apiKey) : null,
      webhookSecretEncrypted: input.webhookSecret ? encryptSecret(input.webhookSecret) : null,
    },
  });
  return withHasSecrets(platform);
}

async function findPlatform(id: number) {
  const platform = await prisma.deliveryPlatform.findFirst({ where: { id, deletedAt: null } });
  if (!platform) throw ApiError.notFound("Delivery platform not found");
  return platform;
}

export async function updatePlatform(id: number, input: UpdatePlatformInput) {
  await findPlatform(id);
  const platform = await prisma.deliveryPlatform.update({
    where: { id },
    data: {
      name: input.name,
      autoAccept: input.autoAccept,
      isActive: input.isActive,
      ...(input.apiKey !== undefined && { apiKeyEncrypted: input.apiKey ? encryptSecret(input.apiKey) : null }),
      ...(input.webhookSecret !== undefined && {
        webhookSecretEncrypted: input.webhookSecret ? encryptSecret(input.webhookSecret) : null,
      }),
    },
  });
  return withHasSecrets(platform);
}

export async function deletePlatform(id: number) {
  await findPlatform(id);
  await prisma.deliveryPlatform.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}
