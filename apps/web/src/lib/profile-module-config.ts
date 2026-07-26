import type { Prisma } from "@popwam/db";

export const PROFILE_MODULE_KEYS = [
  "IDENTITY", "ABOUT", "CONTACT", "SOCIAL", "LINKS",
  "GALLERY", "SERVICES", "PORTFOLIO", "BRANCHES", "CATALOG",
] as const;

export type ProfileModuleKey = (typeof PROFILE_MODULE_KEYS)[number];
export type SafeModuleConfiguration = Record<string, string | number | boolean>;

type Rule = (value: unknown) => boolean;
type DefinitionRules = Record<string, Rule>;

const oneOf = <T extends string>(...allowed: T[]): Rule => (value) => typeof value === "string" && allowed.includes(value as T);
const bool: Rule = (value) => typeof value === "boolean";
const integerRange = (minimum: number, maximum: number): Rule => (value) => typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;

const LAYOUT = oneOf("standard", "compact", "list", "grid");
const MODULE_CONFIGURATION_RULES: Partial<Record<ProfileModuleKey, DefinitionRules>> = {
  IDENTITY: { layout: LAYOUT, headerAlign: oneOf("start", "center", "end") },
  ABOUT: { layout: LAYOUT },
  CONTACT: { layout: oneOf("grid", "row", "list"), showLabels: bool },
  SOCIAL: { layout: oneOf("list", "grid") },
  LINKS: { layout: oneOf("list", "grid", "compact") },
  GALLERY: { layout: oneOf("grid", "list"), columns: integerRange(1, 4) },
  SERVICES: { layout: oneOf("list", "grid"), showPrices: bool },
  PORTFOLIO: { layout: oneOf("grid", "list"), columns: integerRange(1, 4) },
  BRANCHES: { layout: oneOf("list", "grid") },
  CATALOG: { layout: oneOf("list", "grid"), showPrices: bool },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export type ConfigurationValidation =
  | { valid: true; value: SafeModuleConfiguration }
  | { valid: false; error: string };

/**
 * Configuration is intentionally presentation-only. Profile identity, contact
 * details, provider data, URLs, and arbitrary nested data belong in typed
 * relations, never in this JSON column.
 */
export function validateProfileModuleConfiguration(key: string, value: unknown): ConfigurationValidation {
  if (value === undefined || value === null) return { valid: true, value: {} };
  if (!isPlainObject(value)) return { valid: false, error: "MODULE_CONFIGURATION_OBJECT_REQUIRED" };
  const serialized = JSON.stringify(value);
  if (serialized.length > 2048) return { valid: false, error: "MODULE_CONFIGURATION_TOO_LARGE" };
  const rules = MODULE_CONFIGURATION_RULES[key as ProfileModuleKey] || {};
  const result: SafeModuleConfiguration = {};
  for (const [property, propertyValue] of Object.entries(value)) {
    if (property === "__proto__" || property === "prototype" || property === "constructor") return { valid: false, error: "MODULE_CONFIGURATION_UNSAFE_KEY" };
    const rule = rules[property];
    if (!rule) return { valid: false, error: "MODULE_CONFIGURATION_UNKNOWN_KEY" };
    if (typeof propertyValue === "object" || typeof propertyValue === "function" || !rule(propertyValue)) return { valid: false, error: "MODULE_CONFIGURATION_INVALID_VALUE" };
    result[property] = propertyValue as string | number | boolean;
  }
  return { valid: true, value: result };
}

export function requireValidProfileModuleConfiguration(key: string, value: unknown): Prisma.InputJsonValue {
  const result = validateProfileModuleConfiguration(key, value);
  if (!result.valid) throw new Error(result.error);
  return result.value as Prisma.InputJsonValue;
}
