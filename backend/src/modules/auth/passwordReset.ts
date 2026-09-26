import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { sendEmail } from "../../lib/notifications/emailProvider";
import { recordAudit } from "../../lib/audit";
import { ApiError } from "../../lib/apiError";

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function resetUrl(token: string): string {
  const base = env.publicAppUrl ?? "http://localhost:5173";
  return `${base}/reset-password?token=${token}`;
}

// Generates a fresh token for the user, stores only its hash + expiry, and
// emails a link. Used for both self-service "forgot password" and admin-
// triggered invites/resets — the two only differ in email wording.
export async function issuePasswordResetLink(
  userId: number,
  recipientEmail: string,
  recipientName: string,
  kind: "invite" | "reset"
): Promise<void> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordResetTokenHash: hashToken(token), passwordResetExpiresAt: expiresAt },
  });

  const url = resetUrl(token);
  const subject = kind === "invite" ? "You've been invited to the POS" : "Reset your POS password";
  const intro =
    kind === "invite"
      ? `An account has been created for you, ${recipientName}. Set your password to get started:`
      : `Hi ${recipientName}, click below to set a new password. If you didn't request this, you can ignore this email.`;

  await sendEmail(
    recipientEmail,
    subject,
    `<p>${intro}</p><p><a href="${url}">${url}</a></p><p>This link expires in 1 hour.</p>`
  );
}

// Consumes a token: verifies it against the stored hash and expiry, updates
// the password, clears the token, and bumps tokenVersion so any existing
// session (e.g. on a lost device) is forced to re-login.
export async function consumePasswordResetToken(
  token: string,
  passwordHash: string
): Promise<{ userId: number }> {
  const hash = hashToken(token);
  const user = await prisma.user.findFirst({
    where: { passwordResetTokenHash: hash, deletedAt: null, isActive: true },
  });

  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    throw ApiError.badRequest("Invalid or expired token");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        tokenVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await recordAudit(tx, {
      userId: user.id,
      action: "USER_PASSWORD_RESET",
      entityType: "User",
      entityId: user.id,
    });
  });

  return { userId: user.id };
}
