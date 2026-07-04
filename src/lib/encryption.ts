import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const b64 = process.env.APP_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error("APP_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be 32 bytes (base64-encoded)");
  }
  return key;
}

function getPreviousKey(): Buffer | null {
  const b64 = process.env.APP_ENCRYPTION_KEY_PREVIOUS;
  if (!b64) return null;
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) return null;
  return key;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a base64-encoded string: iv + authTag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Concatenate: iv (12) + authTag (16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts a base64-encoded string produced by encrypt().
 * Tries the current key first, then the previous key for key rotation support.
 * Returns null if decryption fails with both keys.
 */
export function decrypt(encoded: string): string | null {
  const combined = Buffer.from(encoded, "base64");
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) return null;

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  // Try current key
  try {
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    // Fall through to previous key
  }

  // Try previous key (for key rotation)
  const prevKey = getPreviousKey();
  if (!prevKey) return null;

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, prevKey, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
