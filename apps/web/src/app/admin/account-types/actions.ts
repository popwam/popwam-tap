"use server";

import { ProfileKind, prisma } from "@popwam/db";
import { revalidatePath } from "next/cache";
import {
  ACCOUNT_TYPE_SETTING_KEY,
  accountTypePolicyJson,
  getAccountTypePolicies,
  MODULE_STATES,
  type ModuleState,
} from "@/lib/account-type-policy";
import { requireAdmin } from "@/lib/session";

export async function saveAccountType(data: FormData) {
  const admin = await requireAdmin();
  const key = String(data.get("key") || "") as ProfileKind;
  if (!Object.values(ProfileKind).includes(key))
    throw new Error("ACCOUNT_TYPE_INVALID");
  const definitions = await prisma.profileModuleDefinition.findMany({
    where: { isActive: true },
    select: { key: true },
  });
  const allowed = new Set(definitions.map((item) => item.key));
  const current = await getAccountTypePolicies();
  const modules = Object.fromEntries(
    definitions.map((definition) => {
      const state = String(
        data.get(`module_${definition.key}`) || "OPTIONAL",
      ) as ModuleState;
      if (!MODULE_STATES.includes(state))
        throw new Error("ACCOUNT_TYPE_MODULE_STATE_INVALID");
      return [definition.key, state];
    }),
  );
  if (modules.IDENTITY === "DISABLED")
    throw new Error("ACCOUNT_TYPE_IDENTITY_REQUIRED");
  for (const field of data.keys())
    if (field.startsWith("module_") && !allowed.has(field.slice(7)))
      throw new Error("ACCOUNT_TYPE_MODULE_INVALID");
  const next = {
    ...current,
    [key]: {
      key,
      nameAr: String(data.get("nameAr") || "")
        .trim()
        .slice(0, 80),
      nameEn: String(data.get("nameEn") || "")
        .trim()
        .slice(0, 80),
      nameFr: String(data.get("nameFr") || "")
        .trim()
        .slice(0, 80),
      enabled: data.get("enabled") === "on",
      requireVerification: data.get("requireVerification") === "on",
      requireAvatar: data.get("requireAvatar") === "on",
      requireCover: data.get("requireCover") === "on",
      modules,
    },
  };
  if (!next[key].nameAr || !next[key].nameEn || !next[key].nameFr)
    throw new Error("ACCOUNT_TYPE_NAMES_REQUIRED");
  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where: { key: ACCOUNT_TYPE_SETTING_KEY },
      create: {
        key: ACCOUNT_TYPE_SETTING_KEY,
        value: accountTypePolicyJson(next),
      },
      update: { value: accountTypePolicyJson(next) },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        operation: "admin.account_type.save",
        metadata: {
          key,
          enabled: next[key].enabled,
          requiredModules: Object.values(modules).filter(
            (state) => state === "REQUIRED",
          ).length,
        },
      },
    }),
  ]);
  revalidatePath("/admin/account-types");
  revalidatePath(`/admin/account-types/${key.toLowerCase()}`);
}
