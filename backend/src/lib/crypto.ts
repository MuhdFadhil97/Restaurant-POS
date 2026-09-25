import crypto from "node:crypto";
import { env } from "../config/env";

// Encrypts delivery-platform API keys/webhook secrets at rest. Unlike a
// print bridge's token (hashed — never needs to be read back), these must be
// recoverable in plaintext to sign outgoing calls and verify inbound webhook
// signatures, so this is reversible encryption, not a one-way hash.
// Key is derived from JWT_SECRET so no new required env var is introduced;
// AES-256-GCM gives both confidentiality and tamper-detection.
const key = crypto.createHash("sha256").update(env.jwtSecret).digest();

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
