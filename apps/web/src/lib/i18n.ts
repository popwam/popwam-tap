import "server-only";
import { cookies, headers } from "next/headers";
import ar from "../../locales/ar.json";
import en from "../../locales/en.json";
import { localeDirection, resolveLocale } from "./locale-policy";

export type Locale = "ar" | "en";
export type Dictionary = typeof ar;

export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get("popwam_locale")?.value;
  const accepted = (await headers()).get("accept-language")?.toLowerCase() || "";
  return resolveLocale(saved, accepted);
}

export function getDictionary(locale: Locale): Dictionary { return (locale === "en" ? en : ar) as Dictionary; }

export async function getI18n() { const locale = await getLocale(); return { locale, dir: localeDirection(locale), dictionary: getDictionary(locale) }; }
