export const themePreferences = ["SYSTEM", "LIGHT", "DARK"] as const;
export const languagePreferences = ["SYSTEM", "ENGLISH", "ARABIC"] as const;
export const fontPreferences = ["DEFAULT", "CAIRO", "ABEEZEE"] as const;
export const notificationCategories = ["generalEnabled", "securityEnabled", "productsEnabled", "socialEnabled", "marketingEnabled"] as const;

export function parseSettingsPatch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set(["theme", "language", "font", "shareActivityIdentity"]);
  if (Object.keys(input).some(key => !allowed.has(key))) return null;
  const output: { theme?: typeof themePreferences[number]; language?: typeof languagePreferences[number]; font?: typeof fontPreferences[number]; shareActivityIdentity?: boolean } = {};
  if ("theme" in input) {
    if (typeof input.theme !== "string" || !themePreferences.includes(input.theme as never)) return null;
    output.theme = input.theme as typeof themePreferences[number];
  }
  if ("language" in input) {
    if (typeof input.language !== "string" || !languagePreferences.includes(input.language as never)) return null;
    output.language = input.language as typeof languagePreferences[number];
  }
  if ("font" in input) {
    if (typeof input.font !== "string" || !fontPreferences.includes(input.font as never)) return null;
    output.font = input.font as typeof fontPreferences[number];
  }
  if ("shareActivityIdentity" in input) {
    if (typeof input.shareActivityIdentity !== "boolean") return null;
    output.shareActivityIdentity = input.shareActivityIdentity;
  }
  return output;
}

export function parseNotificationPatch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !notificationCategories.includes(key as never))) return null;
  const output: Partial<Record<typeof notificationCategories[number], boolean>> = {};
  for (const key of notificationCategories) {
    if (key in input) {
      if (typeof input[key] !== "boolean") return null;
      output[key] = input[key];
    }
  }
  return output;
}

export function permissionStateIsDeviceOwned(value: unknown) {
  return value === "ALLOWED" || value === "DENIED" || value === "NOT_REQUESTED" || value === "UNAVAILABLE";
}
