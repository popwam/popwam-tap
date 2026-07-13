import { prisma } from "@popwam/db";

export const BRANDING_FALLBACKS = {
  mainLogoUrl: "/icons/logo.svg",
  lightLogoUrl: "/icons/logo-light.svg",
  darkLogoUrl: "/icons/logo-dark.svg",
  appIconUrl: "/api/pwa-icon?size=512",
  faviconUrl: "/api/pwa-icon?size=192",
  appleTouchIconUrl: "/api/pwa-icon?size=180",
  pwaIcon192Url: "/api/pwa-icon?size=192",
  pwaIcon512Url: "/api/pwa-icon?size=512",
  defaultOgImageUrl: "/api/pwa-icon?size=512",
} as const;

export async function getBrandingSettings() {
  const saved = await prisma.brandSettings.findUnique({ where: { id: "default" } }).catch(() => null);
  return Object.fromEntries(Object.entries(BRANDING_FALLBACKS).map(([key, fallback]) => [key, saved?.[key as keyof typeof saved] || fallback])) as Record<keyof typeof BRANDING_FALLBACKS, string>;
}
