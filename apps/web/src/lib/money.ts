import { Prisma } from "@popwam/db";

const MONEY_PATTERN = /^\d{1,12}(?:\.\d{1,2})?$/;

/** Parse a non-negative Decimal(14,2) value without passing through a JS number. */
export function parseMoney(raw: string | null | undefined, field = "money") {
  const value = String(raw ?? "").trim() || "0";
  if (!MONEY_PATTERN.test(value)) throw new Error(`INVALID_MONEY:${field}`);
  return new Prisma.Decimal(value);
}

export function decimalZero() {
  return new Prisma.Decimal(0);
}
