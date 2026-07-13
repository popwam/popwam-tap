import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import { getI18n } from "@/lib/i18n";
import { PwaClient } from "@/components/pwa-client";
import { getBrandingSettings } from "@/lib/branding";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-latin" });
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], display: "swap", variable: "--font-arabic" });

export async function generateMetadata():Promise<Metadata>{const branding=await getBrandingSettings();return {
  metadataBase:new URL(process.env.NEXT_PUBLIC_APP_URL||"http://localhost:3000"),title:{default:"POPWAM Tap",template:"%s · POPWAM Tap"},description:"Smart NFC and QR cards controlled securely from the cloud.",applicationName:"POPWAM Tap",manifest:"/manifest.webmanifest",
  appleWebApp:{capable:true,title:"POPWAM Tap",statusBarStyle:"black-translucent"},icons:{icon:branding.faviconUrl,apple:branding.appleTouchIconUrl},openGraph:{images:[branding.defaultOgImageUrl]},
};}
export const viewport: Viewport = { themeColor: "#07090f", colorScheme: "dark" };

export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>){const {locale,dir,dictionary}=await getI18n();return <html lang={locale} dir={dir}><body className={`${inter.variable} ${arabic.variable}`}><PwaClient installLabel={dictionary.pwa.install}/>{children}</body></html>}
