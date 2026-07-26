import "server-only";

import { prisma } from "@popwam/db";
import {
  ENGLISH_ONLY_LOCALIZATION,
  LOCALIZATION_SETTING_KEY,
  publicLocalizationBootstrap,
  sanitizeLocalizationConfig,
  type RuntimeLocalizationConfig,
} from "./localization-policy";

export async function getRuntimeLocalizationConfig(): Promise<RuntimeLocalizationConfig> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: LOCALIZATION_SETTING_KEY },
    select: { value: true },
  });
  return setting ? sanitizeLocalizationConfig(setting.value) : ENGLISH_ONLY_LOCALIZATION;
}

export async function getPublicLocalizationBootstrap() {
  return publicLocalizationBootstrap(await getRuntimeLocalizationConfig());
}
