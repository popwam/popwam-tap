import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const MAX_BATCH_QUANTITY = 1000;

export function createOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashActivationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function activationTokenMatches(token: string, expectedHash: string) {
  const actual = Buffer.from(hashActivationToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function normalizeBatchPrefix(value: string, fallback: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized || fallback;
}

export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
