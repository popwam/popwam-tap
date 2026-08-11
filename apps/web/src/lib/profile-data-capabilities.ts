import { z } from "zod";

export const PROFILE_STRUCTURED_VALUE_TYPES = [
  "TEXT", "LONG_TEXT", "URL", "EMAIL", "INTEGER", "STRING_LIST",
  "EDUCATION", "EXPERIENCE", "PROJECT", "WEEKLY_HOURS",
] as const;

export type ProfileStructuredValueType = (typeof PROFILE_STRUCTURED_VALUE_TYPES)[number];
export type CanonicalProfileKind = "PERSONAL" | "BUSINESS";
export type ProfileDataClassification = "PUBLIC_PROFILE" | "ACCOUNT_PRIVATE" | "TRUST_VERIFICATION";

type ProfileFieldCapabilityDefinition = {
  key: string;
  moduleKey: string;
  labelEn: string;
  labelAr: string;
  valueType: ProfileStructuredValueType;
  kinds?: CanonicalProfileKind[];
  categories?: string[];
  repeatable?: boolean;
  requiredForCompletion?: boolean;
  visibilitySupported?: boolean;
  maxItems?: number;
  schema: z.ZodTypeAny;
  classification?: "PUBLIC_PROFILE";
};

const text = (maximum = 160) => z.string().trim().min(1).max(maximum);
const optionalText = (maximum = 160) => z.string().trim().max(maximum).optional().default("");
const url = z.string().trim().min(1).max(2048).transform((raw, context) => {
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.username || parsed.password) throw new Error();
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname))) throw new Error();
    return parsed.toString();
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "URL_INVALID" });
    return z.NEVER;
  }
});
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const stringList = z.array(text(80)).min(1).max(20).transform((items) => [...new Set(items)]);
const year = z.number().int().min(1900).max(2200).optional();
const education = z.object({ institution: text(160), qualification: optionalText(160), field: optionalText(160), startYear: year, endYear: year });
const experience = z.object({ organization: text(160), role: text(160), summary: optionalText(1000), startYear: year, endYear: year, current: z.boolean().optional().default(false) });
const project = z.object({ name: text(160), summary: optionalText(1000), url: url.optional() });
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const dayHours = z.object({ closed: z.boolean().default(false), open: clock.optional(), close: clock.optional() }).superRefine((value, context) => {
  if (!value.closed && (!value.open || !value.close)) context.addIssue({ code: z.ZodIssueCode.custom, message: "HOURS_REQUIRED" });
});
const weeklyHours = z.object({
  monday: dayHours.optional(), tuesday: dayHours.optional(), wednesday: dayHours.optional(),
  thursday: dayHours.optional(), friday: dayHours.optional(), saturday: dayHours.optional(), sunday: dayHours.optional(),
}).refine((value) => Object.keys(value).length > 0, "HOURS_REQUIRED");

const capability = (definition: ProfileFieldCapabilityDefinition) => ({ classification: "PUBLIC_PROFILE" as const, visibilitySupported: true, maxItems: definition.repeatable ? 20 : 1, ...definition });

export const PROFILE_FIELD_CAPABILITIES: readonly ProfileFieldCapabilityDefinition[] = [
  capability({ key: "city", moduleKey: "CONTACT", labelEn: "City", labelAr: "المدينة", valueType: "TEXT", schema: text(120) }),
  capability({ key: "country", moduleKey: "CONTACT", labelEn: "Country", labelAr: "الدولة", valueType: "TEXT", schema: text(120) }),
  capability({ key: "additional_languages", moduleKey: "ABOUT", labelEn: "Languages", labelAr: "اللغات", valueType: "STRING_LIST", schema: stringList }),

  capability({ key: "specialization", moduleKey: "ABOUT", labelEn: "Specialization", labelAr: "التخصص", valueType: "TEXT", categories: ["freelancer", "professional"], schema: text(160) }),
  capability({ key: "skills", moduleKey: "ABOUT", labelEn: "Skills", labelAr: "المهارات", valueType: "STRING_LIST", categories: ["freelancer", "professional"], schema: stringList }),
  capability({ key: "years_experience", moduleKey: "ABOUT", labelEn: "Years of experience", labelAr: "سنوات الخبرة", valueType: "INTEGER", categories: ["freelancer", "professional"], schema: z.number().int().min(0).max(80) }),
  capability({ key: "education", moduleKey: "PORTFOLIO", labelEn: "Education", labelAr: "التعليم", valueType: "EDUCATION", categories: ["freelancer", "professional"], repeatable: true, maxItems: 20, schema: education }),
  capability({ key: "work_experience", moduleKey: "PORTFOLIO", labelEn: "Experience", labelAr: "الخبرة", valueType: "EXPERIENCE", categories: ["freelancer", "professional"], repeatable: true, maxItems: 30, schema: experience }),
  capability({ key: "project", moduleKey: "PORTFOLIO", labelEn: "Project", labelAr: "مشروع", valueType: "PROJECT", categories: ["freelancer", "professional"], repeatable: true, maxItems: 30, schema: project }),
  capability({ key: "certificate", moduleKey: "PORTFOLIO", labelEn: "Certificate", labelAr: "شهادة", valueType: "PROJECT", categories: ["freelancer", "professional"], repeatable: true, maxItems: 30, schema: project }),
  capability({ key: "service_area", moduleKey: "SERVICES", labelEn: "Service area", labelAr: "منطقة الخدمة", valueType: "TEXT", categories: ["freelancer", "professional", "restaurant", "clinic", "salon", "agency", "company"], repeatable: true, maxItems: 20, schema: text(160) }),
  capability({ key: "availability", moduleKey: "CONTACT", labelEn: "Availability", labelAr: "التوفر", valueType: "TEXT", categories: ["freelancer", "professional"], schema: text(300) }),
  capability({ key: "portfolio_url", moduleKey: "LINKS", labelEn: "Portfolio URL", labelAr: "رابط معرض الأعمال", valueType: "URL", categories: ["freelancer", "professional", "creator"], schema: url }),

  capability({ key: "trade_name", moduleKey: "IDENTITY", labelEn: "Trade name", labelAr: "الاسم التجاري", valueType: "TEXT", kinds: ["BUSINESS"], schema: text(160) }),
  capability({ key: "subcategory", moduleKey: "ABOUT", labelEn: "Subcategory", labelAr: "التصنيف الفرعي", valueType: "TEXT", kinds: ["BUSINESS"], schema: text(160) }),
  capability({ key: "working_hours", moduleKey: "CONTACT", labelEn: "Working hours", labelAr: "ساعات العمل", valueType: "WEEKLY_HOURS", kinds: ["BUSINESS"], schema: weeklyHours }),
  capability({ key: "team_member", moduleKey: "PORTFOLIO", labelEn: "Team member", labelAr: "عضو الفريق", valueType: "PROJECT", kinds: ["BUSINESS"], repeatable: true, maxItems: 50, schema: project }),
  capability({ key: "business_size", moduleKey: "ABOUT", labelEn: "Business size", labelAr: "حجم النشاط", valueType: "TEXT", kinds: ["BUSINESS"], schema: text(80) }),
  capability({ key: "catalog_url", moduleKey: "CATALOG", labelEn: "Catalogue URL", labelAr: "رابط الكتالوج", valueType: "URL", kinds: ["BUSINESS"], schema: url }),
  capability({ key: "store_url", moduleKey: "LINKS", labelEn: "Store URL", labelAr: "رابط المتجر", valueType: "URL", categories: ["supermarket", "company", "agency", "salon"], schema: url }),

  capability({ key: "cuisine", moduleKey: "ABOUT", labelEn: "Cuisine", labelAr: "نوع المطبخ", valueType: "TEXT", categories: ["restaurant"], requiredForCompletion: true, schema: text(160) }),
  capability({ key: "menu_url", moduleKey: "CATALOG", labelEn: "Menu URL", labelAr: "رابط القائمة", valueType: "URL", categories: ["restaurant"], schema: url }),
  capability({ key: "order_url", moduleKey: "LINKS", labelEn: "Order URL", labelAr: "رابط الطلب", valueType: "URL", categories: ["restaurant"], schema: url }),
  capability({ key: "delivery_url", moduleKey: "LINKS", labelEn: "Delivery URL", labelAr: "رابط التوصيل", valueType: "URL", categories: ["restaurant"], schema: url }),
  capability({ key: "reservation_url", moduleKey: "LINKS", labelEn: "Reservation URL", labelAr: "رابط الحجز", valueType: "URL", categories: ["restaurant"], schema: url }),
  capability({ key: "feature", moduleKey: "SERVICES", labelEn: "Feature", labelAr: "ميزة", valueType: "TEXT", categories: ["restaurant"], repeatable: true, maxItems: 30, schema: text(160) }),

  capability({ key: "provider_type", moduleKey: "ABOUT", labelEn: "Provider type", labelAr: "نوع مقدم الخدمة", valueType: "TEXT", categories: ["clinic"], schema: text(160) }),
  capability({ key: "specialty", moduleKey: "ABOUT", labelEn: "Specialty", labelAr: "التخصص", valueType: "TEXT", categories: ["clinic"], requiredForCompletion: true, schema: text(160) }),
  capability({ key: "sub_specialty", moduleKey: "ABOUT", labelEn: "Sub-specialty", labelAr: "التخصص الدقيق", valueType: "TEXT", categories: ["clinic"], schema: text(160) }),
  capability({ key: "booking_url", moduleKey: "LINKS", labelEn: "Booking URL", labelAr: "رابط الحجز", valueType: "URL", categories: ["clinic", "salon", "freelancer", "professional"], schema: url }),
  capability({ key: "doctor", moduleKey: "PORTFOLIO", labelEn: "Doctor or provider", labelAr: "الطبيب أو مقدم الخدمة", valueType: "PROJECT", categories: ["clinic"], repeatable: true, maxItems: 50, schema: project }),

  capability({ key: "featured_content_url", moduleKey: "PORTFOLIO", labelEn: "Featured content", labelAr: "محتوى مميز", valueType: "URL", categories: ["creator"], repeatable: true, maxItems: 30, schema: url }),
  capability({ key: "business_inquiry_email", moduleKey: "CONTACT", labelEn: "Business inquiry email", labelAr: "بريد استفسارات الأعمال", valueType: "EMAIL", categories: ["creator"], schema: email }),
] as const;

function applies(definition: ProfileFieldCapabilityDefinition, kind: CanonicalProfileKind, categoryKey: string | null) {
  if (definition.kinds && !definition.kinds.includes(kind)) return false;
  if (definition.categories && (!categoryKey || !definition.categories.includes(categoryKey))) return false;
  return true;
}

export function profileFieldCapabilities(kind: CanonicalProfileKind, categoryKey: string | null, locale: "ar" | "en") {
  return PROFILE_FIELD_CAPABILITIES.filter((definition) => applies(definition, kind, categoryKey)).map((definition) => ({
    key: definition.key,
    moduleKey: definition.moduleKey,
    label: locale === "ar" ? definition.labelAr : definition.labelEn,
    valueType: definition.valueType,
    repeatable: Boolean(definition.repeatable),
    requiredForCompletion: Boolean(definition.requiredForCompletion),
    visibilitySupported: definition.visibilitySupported !== false,
    maxItems: definition.maxItems ?? (definition.repeatable ? 20 : 1),
    classification: "PUBLIC_PROFILE" as const,
  }));
}

export function allowedStructuredModuleKeys(kind: CanonicalProfileKind, categoryKey: string | null) {
  return new Set(PROFILE_FIELD_CAPABILITIES.filter((definition) => applies(definition, kind, categoryKey)).map((definition) => definition.moduleKey));
}

export function validateProfileStructuredValue(kind: CanonicalProfileKind, categoryKey: string | null, fieldKey: string, value: unknown) {
  const definition = PROFILE_FIELD_CAPABILITIES.find((candidate) => candidate.key === fieldKey && applies(candidate, kind, categoryKey));
  if (!definition) throw new Error("PROFILE_FIELD_NOT_ALLOWED");
  const parsed = definition.schema.safeParse(value);
  if (!parsed.success) throw new Error("PROFILE_FIELD_INVALID");
  return { definition, value: parsed.data };
}

const PUBLIC_PROFILE_MODELED_KEYS = [
  "slug", "displayName", "firstName", "lastName", "profession", "customProfession", "headline", "title", "jobTitle", "company", "industryAr", "industryEn", "bio", "avatar", "logo", "cover",
  "category", "subcategory", "primaryLanguage", "additional_languages", "city", "country", "phone", "alternatePhone",
  "whatsappBusiness", "whatsappPrivate", "email", "website", "address", "location", "socialLinks", "customLinks", "gallery",
  "theme", "services", "branches", "trade_name", "business_size", "working_hours", "team_member", "specialization",
  "skills", "years_experience", "education", "work_experience", "project", "certificate", "service_area", "availability", "portfolio_url", "catalog_url", "store_url", "cuisine",
  "menu_url", "order_url", "delivery_url", "reservation_url", "feature", "provider_type", "specialty", "sub_specialty", "booking_url",
  "doctor", "featured_content_url", "business_inquiry_email",
] as const;

const ACCOUNT_PRIVATE_MODELED_KEYS = [
  "userId", "organizationId", "profileOwnership", "displayLabel", "isPrimary", "creationKey", "draftSlug", "draftRevision",
  "authenticatedPhone", "accountEmail", "accountCountry", "accountLocale", "accountStatus", "securityState", "linkedDevices",
  "externalAuthIdentity", "entitlements", "subscription", "authorizedRepresentativeRelationship",
] as const;

const TRUST_VERIFICATION_MODELED_KEYS = [
  "legalFullName", "dateOfBirth", "identityDocumentType", "identityDocumentNumber", "identityEvidence", "selfieLiveness",
  "legalEntityName", "legalStructure", "registrationNumber", "registrationCountry", "registeredAddress", "authorizedRepresentative",
  "businessEvidence", "taxEvidence", "professionalLicense", "professionalCertificateEvidence", "medicalRegistration", "medicalCredentialEvidence",
  "domainEvidence", "contactVerificationEvidence", "verificationProviderReference", "verificationReviewNotes",
] as const;

/** Complete code-owned classification inventory. Only PUBLIC_PROFILE keys can
 * be exposed by the owner field-capability/editor and publication pipelines. */
export const PROFILE_DATA_FIELD_INVENTORY = [
  ...PUBLIC_PROFILE_MODELED_KEYS.map((key) => ({ key, classification: "PUBLIC_PROFILE" as const })),
  ...ACCOUNT_PRIVATE_MODELED_KEYS.map((key) => ({ key, classification: "ACCOUNT_PRIVATE" as const })),
  ...TRUST_VERIFICATION_MODELED_KEYS.map((key) => ({ key, classification: "TRUST_VERIFICATION" as const })),
] as const;

export function profileDataClassification(key: string): ProfileDataClassification | null {
  return PROFILE_DATA_FIELD_INVENTORY.find((item) => item.key === key)?.classification || null;
}
