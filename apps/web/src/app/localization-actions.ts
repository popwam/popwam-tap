"use server";

import { Prisma, prisma } from "@popwam/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import {
  LOCALIZATION_SETTING_KEY,
  sanitizeLocalizationConfig,
} from "@/lib/localization-policy";

export async function saveLocalizationRuntime(data: FormData) {
  const admin = await requireAdmin();
  const currentRaw = String(data.get("currentConfig") || "{}");
  const current = sanitizeLocalizationConfig(JSON.parse(currentRaw));
  const locales = current.locales.map(locale => {
    const translationsRaw = String(data.get(`translations_${locale.code}`) || "{}");
    let translations: Record<string, string>;
    try {
      const parsed = JSON.parse(translationsRaw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      translations = Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    } catch {
      throw new Error(`LOCALIZATION_TRANSLATIONS_INVALID:${locale.code}`);
    }
    return {
      ...locale,
      enabled: locale.code === "en" || data.get(`enabled_${locale.code}`) === "on",
      published: locale.code === "en" || data.get(`published_${locale.code}`) === "on",
      translations,
    };
  });
  const next = sanitizeLocalizationConfig({
    defaultLocale: String(data.get("defaultLocale") || "en"),
    translationVersion: current.translationVersion + 1,
    locales,
  });
  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where: { key: LOCALIZATION_SETTING_KEY },
      create: { key: LOCALIZATION_SETTING_KEY, value: next as unknown as Prisma.InputJsonValue },
      update: { value: next as unknown as Prisma.InputJsonValue },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        operation: "admin.localization.update",
        metadata: { translationVersion: next.translationVersion, locales: next.locales.map(locale => locale.code) },
      },
    }),
  ]);
  revalidatePath("/admin/localization");
}
