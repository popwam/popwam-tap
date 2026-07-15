import { isSafeDestinationUrl, normalizeDestination } from "./url";

export type LinkPlatformDefinition = {
  slug: string;
  inputType: string;
  urlTemplate?: string | null;
  validationPattern?: string | null;
  androidAppUrl?: string | null;
  iosAppUrl?: string | null;
  webFallback?: string | null;
};

export function buildPlatformUrl(platform: LinkPlatformDefinition, raw: string) {
  const input = raw.trim();
  if (!input) return { valid: false as const, error: "VALUE_REQUIRED" };
  if (platform.validationPattern && platform.validationPattern.length <= 200) {
    try { if (!new RegExp(platform.validationPattern).test(input)) return { valid: false as const, error: "VALUE_INVALID" }; } catch { return { valid: false as const, error: "PLATFORM_RULE_INVALID" }; }
  }
  if (["FULL_URL", "USERNAME_OR_URL"].includes(platform.inputType) && isSafeDestinationUrl(input)) return { valid: true as const, url: input };
  if (platform.inputType === "PHONE" || platform.slug === "whatsapp") {
    const url = normalizeDestination("WHATSAPP_PRIVATE", input);
    return isSafeDestinationUrl(url) ? { valid: true as const, url } : { valid: false as const, error: "VALUE_INVALID" };
  }
  const value = input.replace(/^@/, "");
  const url = platform.urlTemplate?.replaceAll("{value}", encodeURIComponent(value)) || (platform.inputType === "FULL_URL" ? normalizeDestination("WEBSITE", input) : "");
  return isSafeDestinationUrl(url) ? { valid: true as const, url } : { valid: false as const, error: "VALUE_INVALID" };
}

export function platformOpenTarget(platform: LinkPlatformDefinition, device: "android" | "ios" | "web") {
  if (device === "android" && platform.androidAppUrl) return platform.androidAppUrl;
  if (device === "ios" && platform.iosAppUrl) return platform.iosAppUrl;
  return platform.webFallback || null;
}
