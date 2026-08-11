import {
  profileFieldCapabilities,
  validateProfileStructuredValue,
  type CanonicalProfileKind,
  type ProfileStructuredValueType,
} from "./profile-data-capabilities";

type PublicEntry = {
  id: string;
  moduleKey: string;
  fieldKey: string;
  value: unknown;
};

export type PublicProfileFieldRow = {
  id: string;
  moduleKey: string;
  fieldKey: string;
  label: string;
  primary: string;
  secondary: string | null;
  href: string | null;
  direction: "ltr" | "auto";
};

const record = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
const joined = (values: unknown[]) => values.map(text).filter(Boolean).join(" · ");
const years = (start: unknown, end: unknown, current: unknown, locale: "ar" | "en") => joined([start, current === true ? (locale === "ar" ? "حتى الآن" : "Present") : end]);

function formatted(valueType: ProfileStructuredValueType, value: unknown, locale: "ar" | "en") {
  if (["TEXT", "LONG_TEXT", "INTEGER"].includes(valueType)) return { primary: text(value), secondary: null, href: null };
  if (valueType === "URL") return { primary: text(value), secondary: null, href: text(value) };
  if (valueType === "EMAIL") return { primary: text(value), secondary: null, href: `mailto:${text(value)}` };
  if (valueType === "STRING_LIST") return { primary: Array.isArray(value) ? joined(value) : "", secondary: null, href: null };
  if (valueType === "EDUCATION") {
    const item = record(value);
    return { primary: text(item.institution), secondary: joined([item.qualification, item.field, years(item.startYear, item.endYear, false, locale)]), href: null };
  }
  if (valueType === "EXPERIENCE") {
    const item = record(value);
    return { primary: joined([item.role, item.organization]), secondary: joined([item.summary, years(item.startYear, item.endYear, item.current, locale)]), href: null };
  }
  if (valueType === "PROJECT") {
    const item = record(value);
    return { primary: text(item.name), secondary: text(item.summary) || null, href: text(item.url) || null };
  }
  if (valueType === "WEEKLY_HOURS") {
    const schedule = record(value);
    const dayLabels: Record<string, string> = locale === "ar"
      ? { monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت", sunday: "الأحد" }
      : { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };
    const rows = Object.keys(dayLabels).flatMap((day) => {
      const hours = record(schedule[day]);
      if (!Object.keys(hours).length) return [];
      return [`${dayLabels[day]}: ${hours.closed === true ? (locale === "ar" ? "مغلق" : "Closed") : joined([hours.open, hours.close])}`];
    });
    return { primary: rows.join(" · "), secondary: null, href: null };
  }
  return { primary: "", secondary: null, href: null };
}

/** Render only registry-owned PUBLIC_PROFILE values. Unknown keys, trust data,
 * malformed legacy JSON, and module/key mismatches are omitted fail-closed. */
export function publicProfileFieldRows(input: {
  kind: CanonicalProfileKind;
  categoryKey: string | null;
  locale: "ar" | "en";
  entries: PublicEntry[];
}): PublicProfileFieldRow[] {
  const capabilities = new Map(profileFieldCapabilities(input.kind, input.categoryKey, input.locale).map((item) => [item.key, item]));
  return input.entries.flatMap((entry) => {
    const capability = capabilities.get(entry.fieldKey);
    if (!capability || capability.moduleKey !== entry.moduleKey || capability.classification !== "PUBLIC_PROFILE") return [];
    try {
      const parsed = validateProfileStructuredValue(input.kind, input.categoryKey, entry.fieldKey, entry.value);
      const value = formatted(capability.valueType, parsed.value, input.locale);
      if (!value.primary) return [];
      return [{
        id: entry.id,
        moduleKey: entry.moduleKey,
        fieldKey: entry.fieldKey,
        label: capability.label,
        primary: value.primary,
        secondary: value.secondary || null,
        href: value.href,
        direction: ["URL", "EMAIL", "INTEGER"].includes(capability.valueType) ? "ltr" as const : "auto" as const,
      }];
    } catch {
      return [];
    }
  });
}
