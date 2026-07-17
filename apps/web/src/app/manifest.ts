import type { MetadataRoute } from "next";
import { getBrandingSettings } from "@/lib/branding";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getBrandingSettings();
  return { name: "POP by POPWAM", short_name: "POP", description: "Manage POP smart products, cards and public destinations.", start_url: "/dashboard", scope: "/", display: "standalone", background_color: "#050505", theme_color: "#D4AF37", orientation: "portrait-primary", icons: [
    { src: branding.pwaIcon192Url, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: branding.pwaIcon512Url, sizes: "512x512", type: "image/png", purpose: "any" },
    { src: branding.pwaIcon512Url, sizes: "512x512", type: "image/png", purpose: "maskable" },
  ] };
}
