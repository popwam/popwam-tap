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
  const addedCode = String(data.get("newLocaleCode") || "")
    .trim()
    .toLowerCase();
  const candidates =
    addedCode && !current.locales.some((locale) => locale.code === addedCode)
      ? [
          ...current.locales,
          {
            code: addedCode,
            name: String(data.get("newLocaleName") || addedCode.toUpperCase()),
            nativeName: String(
              data.get("newLocaleNativeName") ||
                data.get("newLocaleName") ||
                addedCode.toUpperCase(),
            ),
            rtl: data.get("newLocaleRtl") === "on",
            enabled: false,
            published: false,
            displayOrder: current.locales.length,
            translations: {},
          },
        ]
      : current.locales;
  const locales = candidates.map((locale) => {
    const translationsRaw = String(
      data.get(`translations_${locale.code}`) || "{}",
    );
    let translations: Record<string, string>;
    try {
      const parsed = JSON.parse(translationsRaw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error();
      translations = Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
    } catch {
      throw new Error(`LOCALIZATION_TRANSLATIONS_INVALID:${locale.code}`);
    }
    return {
      ...locale,
      name:
        String(data.get(`name_${locale.code}`) || locale.name)
          .trim()
          .slice(0, 80) || locale.name,
      nativeName:
        String(data.get(`nativeName_${locale.code}`) || locale.nativeName)
          .trim()
          .slice(0, 80) || locale.nativeName,
      rtl:
        locale.code === "en" ? false : data.get(`rtl_${locale.code}`) === "on",
      enabled:
        locale.code === "en" || data.get(`enabled_${locale.code}`) === "on",
      published:
        locale.code === "en" || data.get(`published_${locale.code}`) === "on",
      displayOrder: Number(
        data.get(`order_${locale.code}`) || locale.displayOrder || 0,
      ),
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
      create: {
        key: LOCALIZATION_SETTING_KEY,
        value: next as unknown as Prisma.InputJsonValue,
      },
      update: { value: next as unknown as Prisma.InputJsonValue },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        operation: "admin.localization.update",
        metadata: {
          translationVersion: next.translationVersion,
          locales: next.locales.map((locale) => locale.code),
        },
      },
    }),
  ]);
  revalidatePath("/admin/localization");
  revalidatePath("/admin/translations");
}

/** Saves one stable key across the dynamically configured locale set. English is
 * the required canonical value; omitted non-English values intentionally fall
 * back to it at runtime. */
export async function saveTranslationKey(data: FormData) {
  const admin = await requireAdmin();
  const key = String(data.get("key") || "").trim();
  if (!/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/i.test(key))
    throw new Error("TRANSLATION_KEY_INVALID");
  const english = String(data.get("value_en") || "").trim();
  if (!english) throw new Error("TRANSLATION_ENGLISH_REQUIRED");
  const current = await (async () => {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: LOCALIZATION_SETTING_KEY },
      select: { value: true },
    });
    return sanitizeLocalizationConfig(setting?.value);
  })();
  const locales = current.locales.map((locale) => {
    const value = String(data.get(`value_${locale.code}`) || "").trim();
    const translations = { ...locale.translations };
    if (locale.code === "en") translations[key] = english;
    else if (value) translations[key] = value;
    else delete translations[key];
    return { ...locale, translations };
  });
  const next = sanitizeLocalizationConfig({
    ...current,
    translationVersion: current.translationVersion + 1,
    locales,
  });
  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where: { key: LOCALIZATION_SETTING_KEY },
      create: {
        key: LOCALIZATION_SETTING_KEY,
        value: next as unknown as Prisma.InputJsonValue,
      },
      update: { value: next as unknown as Prisma.InputJsonValue },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        operation: "admin.localization.translation.save",
        metadata: { key, translationVersion: next.translationVersion },
      },
    }),
  ]);
  revalidatePath("/admin/localization");
  revalidatePath("/admin/translations");
  revalidatePath("/admin/platform-readiness");
}
