import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "POPWAM Tap", short_name: "POPWAM Tap", description: "Manage POPWAM smart NFC cards and public destinations.", start_url: "/dashboard", scope: "/", display: "standalone", background_color: "#07090f", theme_color: "#07090f", orientation: "portrait-primary", icons: [
    { src: "/api/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/api/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/api/pwa-icon?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ] };
}
