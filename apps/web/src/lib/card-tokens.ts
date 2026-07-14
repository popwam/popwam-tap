import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const MAX_BATCH_QUANTITY = 1000;

export function createOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

const ACTIVATION_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function createActivationCode() {
  const bytes = randomBytes(8);
  const characters = Array.from(bytes, byte => ACTIVATION_ALPHABET[byte % ACTIVATION_ALPHABET.length]);
  return `${characters.slice(0, 4).join("")}-${characters.slice(4).join("")}`;
}

export function normalizeActivationToken(token: string) {
  const trimmed = token.trim();
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed;
}

export function isActivationToken(token: string) {
  const normalized = normalizeActivationToken(token);
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized) || normalized.length >= 32;
}

function tokenPepper(explicit?: string) {
  const value = explicit || process.env.ACTIVATION_TOKEN_PEPPER || process.env.OTP_PEPPER || process.env.NEXTAUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("ACTIVATION_TOKEN_PEPPER_REQUIRED");
  return value || "popwam-development-activation-pepper";
}

export function hashActivationToken(token: string, pepper?: string) {
  const normalized = normalizeActivationToken(token);
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized)
    ? createHmac("sha256", tokenPepper(pepper)).update(normalized, "utf8").digest("hex")
    : createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function activationTokenMatches(token: string, expectedHash: string) {
  const actual = Buffer.from(hashActivationToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function sealActivationCode(code: string, pepper?: string) {
  const key = createHash("sha256").update(tokenPepper(pepper), "utf8").digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(normalizeActivationToken(code), "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function openActivationCode(value: string, pepper?: string) {
  if (!value.startsWith("v1.")) return normalizeActivationToken(value);
  const [, ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("ACTIVATION_CODE_CIPHERTEXT_INVALID");
  const key = createHash("sha256").update(tokenPepper(pepper), "utf8").digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
}

export function normalizeBatchPrefix(value: string, fallback: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized || fallback;
}

export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
