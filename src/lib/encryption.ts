import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const HKDF_SALT = "trustloop-key-encryption-v1";
const HKDF_INFO = "aes-256-gcm-key";

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("KEY_ENCRYPTION_SECRET is required for key encryption.");
  }

  // Use HKDF for proper key derivation instead of raw SHA-256
  const derived = hkdfSync(
    "sha256",
    secret,
    HKDF_SALT,
    HKDF_INFO,
    32, // 256 bits for AES-256
  );

  cachedKey = Buffer.from(derived);
  return cachedKey;
}

/**
 * Legacy key derivation for backward compatibility with existing encrypted data.
 * New encryptions use HKDF. Decryption tries HKDF first, falls back to legacy.
 */
function getLegacyEncryptionKey(): Buffer {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("KEY_ENCRYPTION_SECRET is required for key encryption.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const key = getEncryptionKey();

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${ciphertext.toString("base64")}:${authTag.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, cipherB64, tagB64] = payload.split(":");
  if (!ivB64 || !cipherB64 || !tagB64) {
    throw new Error("Encrypted key payload is invalid.");
  }

  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");

  // Try HKDF-derived key first (new encryptions)
  try {
    const key = getEncryptionKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    // Fall back to legacy SHA-256 key for data encrypted before HKDF migration
  }

  const legacyKey = getLegacyEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, legacyKey, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export function last4(secret: string): string {
  const cleaned = secret.trim();
  if (cleaned.length <= 4) {
    return cleaned;
  }
  return cleaned.slice(-4);
}
