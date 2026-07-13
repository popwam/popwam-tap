export const APP_NAME = "POPWAM Tap";
export const DEFAULT_PUBLIC_APP_URL = "http://localhost:3000";

export const DESTINATION_TYPES = [
  "PROFILE", "WHATSAPP_BUSINESS", "WHATSAPP_PRIVATE", "PHONE", "EMAIL",
  "WEBSITE", "VCF", "FACEBOOK", "LINKEDIN", "GITHUB", "TIKTOK", "CUSTOM_URL",
] as const;

export type DestinationTypeValue = (typeof DESTINATION_TYPES)[number];

export const destinationIcons: Record<DestinationTypeValue, string> = {
  PROFILE: "👤", WHATSAPP_BUSINESS: "💬", WHATSAPP_PRIVATE: "💬", PHONE: "📞",
  EMAIL: "✉️", WEBSITE: "🌐", VCF: "💾", FACEBOOK: "ⓕ", LINKEDIN: "in",
  GITHUB: "⌘", TIKTOK: "♪", CUSTOM_URL: "🔗",
};

export function getPublicAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_PUBLIC_APP_URL).replace(/\/$/, "");
}

export function getTagUrl(token: string) {
  return `${getPublicAppUrl()}/t/${encodeURIComponent(token)}`;
}
