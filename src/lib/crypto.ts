import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { getEnv } from "@/env";

/**
 * Symmetric encryption for supplier auth tokens at rest.
 *
 * Tokens are "write-only" from the UI's perspective: once saved they are
 * encrypted with AES-256-GCM and only ever decrypted server-side at fetch time.
 * The stored payload format is `v1:<iv>:<authTag>:<ciphertext>` (all base64).
 */
const ALGO = "aes-256-gcm";
const SALT = "recharge-partners-portal:v1"; // static salt is fine — the key itself is the secret
const IV_LENGTH = 12; // GCM standard nonce length

let keyCache: Buffer | null = null;
function getKey(): Buffer {
  if (keyCache) return keyCache;
  const { ENCRYPTION_KEY } = getEnv();
  keyCache = scryptSync(ENCRYPTION_KEY, SALT, 32);
  return keyCache;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted secret payload");
  }
  const decipher = createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
