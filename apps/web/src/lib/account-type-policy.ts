import { Prisma, prisma, type ProfileKind } from "@popwam/db";

export const ACCOUNT_TYPE_SETTING_KEY = "profile.account-types.v1";
export const MODULE_STATES = ["REQUIRED", "OPTIONAL", "DISABLED"] as const;
export type ModuleState = (typeof MODULE_STATES)[number];
export type AccountTypePolicy = {
  key: ProfileKind;
  nameAr: string;
  nameEn: string;
  nameFr: string;
  enabled: boolean;
  modules: Record<string, ModuleState>;
  requireVerification: boolean;
  requireAvatar: boolean;
  requireCover: boolean;
};

export function defaultAccountTypePolicies(
  moduleKeys: string[],
): Record<ProfileKind, AccountTypePolicy> {
  const modules = Object.fromEntries(
    moduleKeys.map((key) => [
      key,
      key === "IDENTITY" ? "REQUIRED" : "OPTIONAL",
    ]),
  ) as Record<string, ModuleState>;
  return {
    PERSONAL: {
      key: "PERSONAL",
      nameAr: "شخصي",
      nameEn: "Personal",
      nameFr: "Personnel",
      enabled: true,
      modules: { ...modules },
      requireVerification: false,
      requireAvatar: false,
      requireCover: false,
    },
    BUSINESS: {
      key: "BUSINESS",
      nameAr: "أعمال",
      nameEn: "Business",
      nameFr: "Entreprise",
      enabled: true,
      modules: { ...modules },
      requireVerification: false,
      requireAvatar: false,
      requireCover: false,
    },
  };
}

export function sanitizeAccountTypePolicies(
  value: unknown,
  moduleKeys: string[],
) {
  const defaults = defaultAccountTypePolicies(moduleKeys);
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    (["PERSONAL", "BUSINESS"] as ProfileKind[]).map((key) => {
      const raw =
        source[key] && typeof source[key] === "object"
          ? (source[key] as Record<string, unknown>)
          : {};
      const rawModules =
        raw.modules && typeof raw.modules === "object"
          ? (raw.modules as Record<string, unknown>)
          : {};
      const modules = Object.fromEntries(
        moduleKeys.map((module) => [
          module,
          MODULE_STATES.includes(rawModules[module] as ModuleState)
            ? (rawModules[module] as ModuleState)
            : defaults[key].modules[module],
        ]),
      );
      return [
        key,
        {
          ...defaults[key],
          nameAr: String(raw.nameAr || defaults[key].nameAr).slice(0, 80),
          nameEn: String(raw.nameEn || defaults[key].nameEn).slice(0, 80),
          nameFr: String(raw.nameFr || defaults[key].nameFr).slice(0, 80),
          enabled:
            raw.enabled === undefined
              ? defaults[key].enabled
              : raw.enabled === true,
          requireVerification: raw.requireVerification === true,
          requireAvatar: raw.requireAvatar === true,
          requireCover: raw.requireCover === true,
          modules,
        },
      ];
    }),
  ) as Record<ProfileKind, AccountTypePolicy>;
}

export async function getAccountTypePolicies(
  db: Pick<typeof prisma, "systemSetting" | "profileModuleDefinition"> = prisma,
) {
  const [setting, definitions] = await Promise.all([
    db.systemSetting.findUnique({
      where: { key: ACCOUNT_TYPE_SETTING_KEY },
      select: { value: true },
    }),
    db.profileModuleDefinition.findMany({
      where: { isActive: true },
      select: { key: true },
      orderBy: { key: "asc" },
    }),
  ]);
  return sanitizeAccountTypePolicies(
    setting?.value,
    definitions.map((item) => item.key),
  );
}

export function accountTypePolicyJson(
  policies: Record<ProfileKind, AccountTypePolicy>,
) {
  return policies as unknown as Prisma.InputJsonValue;
}
