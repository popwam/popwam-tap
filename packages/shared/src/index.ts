export const APP_NAME = "POPWAM Tap";
export const DEFAULT_PUBLIC_APP_URL = "http://localhost:3000";

export const DESTINATION_TYPES = [
  "PROFILE", "WHATSAPP_BUSINESS", "WHATSAPP_PRIVATE", "PHONE", "EMAIL", "WEBSITE", "VCF",
  "FACEBOOK", "LINKEDIN", "GITHUB", "TIKTOK", "INSTAGRAM", "X", "YOUTUBE", "TELEGRAM",
  "LOCATION", "FILE", "SOCIAL", "CUSTOM_FIELD", "CUSTOM_URL",
] as const;
export type DestinationTypeValue = (typeof DESTINATION_TYPES)[number];

export const defaultIconKeys: Record<DestinationTypeValue, string> = {
  PROFILE: "profile", WHATSAPP_BUSINESS: "whatsapp", WHATSAPP_PRIVATE: "whatsapp", PHONE: "phone",
  EMAIL: "email", WEBSITE: "website", VCF: "contact", FACEBOOK: "facebook", LINKEDIN: "linkedin",
  GITHUB: "github", TIKTOK: "tiktok", INSTAGRAM: "instagram", X: "x", YOUTUBE: "youtube",
  TELEGRAM: "telegram", LOCATION: "location", FILE: "file", SOCIAL: "social",
  CUSTOM_FIELD: "custom", CUSTOM_URL: "link",
};

// Text fallback for non-React consumers. The web app maps icon keys to a safe Lucide component map.
export const destinationIcons = Object.fromEntries(DESTINATION_TYPES.map((type) => [type, defaultIconKeys[type]])) as Record<DestinationTypeValue, string>;

export const RESERVED_SHORT_CODES = new Set([
  "admin", "dashboard", "login", "api", "auth", "health", "p", "t", "settings", "new", "edit",
  "uploads", "manifest.json", "favicon.ico", "robots.txt", "sitemap.xml", "offline", "sw.js",
]);

export function normalizeShortCode(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function validateShortCode(value: string) {
  const code = normalizeShortCode(value);
  if (code.length < 2 || code.length > 48) return { valid: false as const, code, reason: "length" as const };
  if (RESERVED_SHORT_CODES.has(code)) return { valid: false as const, code, reason: "reserved" as const };
  return { valid: true as const, code };
}

export function getPublicAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_PUBLIC_APP_URL).replace(/\/$/, "");
}

export function getTagUrl(token: string) {
  return `${getPublicAppUrl()}/${encodeURIComponent(token)}`;
}

export function getLegacyTagUrl(token: string) {
  return `${getPublicAppUrl()}/t/${encodeURIComponent(token)}`;
}
