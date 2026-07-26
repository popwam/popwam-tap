import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

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

export const ACTIVATION_SCRATCH_VERSION = 1;
export const ACTIVATION_SCRATCH_LENGTH = 6;

export function createActivationScratchSecret() {
  return randomInt(0, 10 ** ACTIVATION_SCRATCH_LENGTH)
    .toString()
    .padStart(ACTIVATION_SCRATCH_LENGTH, "0");
}

export function normalizeActivationScratchSecret(value: string) {
  return value.replace(/\s+/g, "");
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

function scratchPepper(explicit?: string) {
  const value = explicit || process.env.ACTIVATION_SCRATCH_PEPPER || process.env.ACTIVATION_TOKEN_PEPPER || process.env.NEXTAUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("ACTIVATION_SCRATCH_PEPPER_REQUIRED");
  return value || "popwam-development-scratch-pepper";
}

export function hashActivationScratchSecret(secret: string, pepper?: string, cost = 32768) {
  const normalized = normalizeActivationScratchSecret(secret);
  if (!new RegExp(`^\\d{${ACTIVATION_SCRATCH_LENGTH}}$`).test(normalized)) throw new Error("ACTIVATION_SECRET_INVALID");
  const salt = randomBytes(16);
  const derived = scryptSync(`${normalized}\0${scratchPepper(pepper)}`, salt, 32, { N: cost, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$v${ACTIVATION_SCRATCH_VERSION}$${cost}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function activationScratchSecretMatches(secret: string, encoded: string, pepper?: string) {
  const normalized = normalizeActivationScratchSecret(secret);
  if (!new RegExp(`^\\d{${ACTIVATION_SCRATCH_LENGTH}}$`).test(normalized)) return false;
  const [algorithm, version, costText, saltText, hashText] = encoded.split("$");
  if (algorithm !== "scrypt" || version !== `v${ACTIVATION_SCRATCH_VERSION}` || !costText || !saltText || !hashText) return false;
  const cost = Number(costText);
  if (!Number.isSafeInteger(cost) || cost < 16384 || cost > 131072) return false;
  try {
    const expected = Buffer.from(hashText, "base64url");
    const actual = scryptSync(`${normalized}\0${scratchPepper(pepper)}`, Buffer.from(saltText, "base64url"), expected.length, { N: cost, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
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
