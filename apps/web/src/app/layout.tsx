import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getI18n } from "@/lib/i18n";
import { PwaClient } from "@/components/pwa-client";
import { FirebaseAnalyticsBootstrap } from "@/components/firebase-analytics-bootstrap";
import { getBrandingSettings } from "@/lib/branding";
import "./globals.css";

const abeezee = localFont({ src: "../../../android/app/src/main/res/font/abeezee.ttf", display: "swap", variable: "--font-latin" });
const arabic = localFont({ src: "../../../android/app/src/main/res/font/cairo.ttf", display: "swap", variable: "--font-arabic" });

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  return { metadataBase: new URL(process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"), title: { default: "POP by POPWAM", template: "%s · POP by POPWAM" }, description: "POP smart cards, products and public profiles.", applicationName: "POP by POPWAM", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "POP by POPWAM", statusBarStyle: "black-translucent" }, icons: { icon: branding.faviconUrl, apple: branding.appleTouchIconUrl }, openGraph: { images: [branding.defaultOgImageUrl] } };
}
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f7fb" }, { media: "(prefers-color-scheme: dark)", color: "#07090f" }], colorScheme: "light dark" };
const appearanceBootstrap = `try{var t=localStorage.getItem("popwam_ui_theme")||"SYSTEM",f=localStorage.getItem("popwam_ui_font")||"DEFAULT";document.documentElement.dataset.uiTheme=t.toLowerCase();document.documentElement.dataset.uiFont=f.toLowerCase()}catch(e){}`;
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { const { locale, dir, dictionary } = await getI18n(); return <html lang={locale} dir={dir} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: appearanceBootstrap }}/></head><body className={`${abeezee.variable} ${arabic.variable}`}><PwaClient installLabel={dictionary.pwa.install}/><FirebaseAnalyticsBootstrap/>{children}</body></html>; }
