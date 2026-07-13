import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import { getI18n } from "@/lib/i18n";
import { PwaClient } from "@/components/pwa-client";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-latin" });
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], display: "swap", variable: "--font-arabic" });

export const metadata: Metadata = {
  title: { default: "POPWAM Tap", template: "%s · POPWAM Tap" }, description: "Smart NFC and QR cards controlled securely from the cloud.",
  applicationName: "POPWAM Tap", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "POPWAM Tap", statusBarStyle: "black-translucent" },
  icons: { icon: "/api/pwa-icon?size=512", apple: "/api/pwa-icon?size=180" },
};
export const viewport: Viewport = { themeColor: "#07090f", colorScheme: "dark" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, dir, dictionary } = await getI18n();
  return <html lang={locale} dir={dir}><body className={`${inter.variable} ${arabic.variable}`}><PwaClient installLabel={dictionary.pwa.install}/>{children}</body></html>;
}
