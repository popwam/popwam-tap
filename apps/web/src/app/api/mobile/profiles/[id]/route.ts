import { Prisma, ProfileTheme, ProfileType, ProfessionType, prisma } from "@popwam/db";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { getUserEntitlements } from "@/lib/plans";
import { isSafeDestinationUrl, normalizeAndValidate, normalizeProfilePhone } from "@/lib/url";

function optional(value: unknown, maximum = 3000) {
  const normalized = String(value || "").trim();
  if (normalized.length > maximum) throw new Error("FIELD_TOO_LONG");
  return normalized || null;
}

function emailValue(value: unknown) {
  const email = optional(value, 254)?.toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("EMAIL_INVALID");
  return email;
}

function phoneValue(value: unknown, countryIso2: string | null) {
  const raw = optional(value, 64);
  if (!raw) return null;
  const phone = normalizeProfilePhone(raw, countryIso2);
  if (!phone) throw new Error("PHONE_INVALID");
  return phone;
}

function has(input: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function patched(input: Record<string, unknown>, key: string, current: string | null, maximum: number) {
  return has(input, key) ? optional(input[key], maximum) : current;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  const { id } = await params;
  const profile = await prisma.profile.findFirst({ where: { id, userId: user.id }, include: { virtualCard: true } });
  if (!profile) return Response.json({ ok: false, error: "PROFILE_NOT_FOUND" }, { status: 404 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  try {
    const type = String(body.type || profile.type) as ProfileType;
    const theme = String(body.theme || profile.theme) as ProfileTheme;
    const profession = String(body.profession || profile.profession) as ProfessionType;
    if (!Object.values(ProfileType).includes(type)
      || !Object.values(ProfileTheme).includes(theme)
      || !Object.values(ProfessionType).includes(profession)) throw new Error("PROFILE_INVALID");
    const { effective } = await getUserEntitlements(user.id);
    if (type === "ORGANIZATION" && profile.type !== "ORGANIZATION" && !effective.allowBusinessCards) throw new Error("BUSINESS_CARD_PLAN_REQUIRED");
    if (Array.isArray(effective.availableThemes) && !effective.availableThemes.map(String).includes(theme)) throw new Error("THEME_NOT_ALLOWED");
    for (const key of ["avatarUrl", "coverUrl", "logoUrl"] as const) {
      const value = optional(body[key], 2048);
      if (value && !isSafeDestinationUrl(value)) throw new Error("URL_INVALID");
    }
    let website = profile.website;
    if (has(body, "website")) {
      const rawWebsite = optional(body.website, 2048);
      const normalizedWebsite = rawWebsite ? normalizeAndValidate("WEBSITE", rawWebsite) : { url: null, valid: true };
      if (!normalizedWebsite.valid) throw new Error("URL_INVALID");
      website = normalizedWebsite.url;
    }
    const countryIso2 = optional(body.countryIso2, 2);
    const displayName = (has(body, "displayNameAr") || has(body, "displayNameEn"))
      ? optional(body.displayNameAr, 120) || optional(body.displayNameEn, 120) || profile.displayName
      : profile.displayName;
    const phone = has(body, "phone") ? phoneValue(body.phone, countryIso2) : profile.phone;
    const alternatePhone = has(body, "alternatePhone") ? phoneValue(body.alternatePhone, countryIso2) : profile.alternatePhone;
    const whatsappBusiness = has(body, "whatsappBusiness")
      ? phoneValue(body.whatsappBusiness, countryIso2)
      : has(body, "whatsapp") ? phoneValue(body.whatsapp, countryIso2) : profile.whatsappBusiness;
    const email = has(body, "email") ? emailValue(body.email) : profile.email;
    const primaryLanguage = has(body, "primaryLanguage") ? String(body.primaryLanguage) : profile.primaryLanguage;
    if (primaryLanguage !== "ar" && primaryLanguage !== "en") throw new Error("LANGUAGE_INVALID");
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Profile" WHERE "id" = ${id} FOR UPDATE`);
      const current = await tx.profile.findFirst({ where: { id, userId: user.id }, select: { draftRevision: true } });
      if (!current) throw new Error("PROFILE_NOT_FOUND");
      await tx.profile.update({
        where: { id },
        data: {
          type,
          profileKind: type === "ORGANIZATION" ? "BUSINESS" : "PERSONAL",
          theme,
          profession,
          customProfession: patched(body, "customProfession", profile.customProfession, 120),
          primaryLanguage,
          displayName,
          displayLabel: patched(body, "profileLabel", profile.displayLabel, 80),
          displayNameAr: patched(body, "displayNameAr", profile.displayNameAr, 120),
          displayNameEn: patched(body, "displayNameEn", profile.displayNameEn, 120),
          organizationNameAr: type === "ORGANIZATION"
            ? (has(body, "displayNameAr") ? optional(body.displayNameAr, 120) : profile.organizationNameAr)
            : null,
          organizationNameEn: type === "ORGANIZATION"
            ? (has(body, "displayNameEn") ? optional(body.displayNameEn, 120) : profile.organizationNameEn)
            : null,
          firstName: patched(body, "firstName", profile.firstName, 80),
          lastName: patched(body, "lastName", profile.lastName, 80),
          jobTitleAr: patched(body, "jobTitleAr", profile.jobTitleAr, 120),
          jobTitleEn: patched(body, "jobTitleEn", profile.jobTitleEn, 120),
          company: patched(body, "company", profile.company, 160),
          bioAr: patched(body, "bioAr", profile.bioAr, 2000),
          bioEn: patched(body, "bioEn", profile.bioEn, 2000),
          industryAr: patched(body, "industryAr", profile.industryAr, 160),
          industryEn: patched(body, "industryEn", profile.industryEn, 160),
          descriptionAr: patched(body, "descriptionAr", profile.descriptionAr, 3000),
          descriptionEn: patched(body, "descriptionEn", profile.descriptionEn, 3000),
          phone,
          alternatePhone,
          whatsappBusiness,
          email,
          website,
          locationText: patched(body, "location", profile.locationText, 300),
          addressAr: has(body, "addressAr")
            ? optional(body.addressAr, 500)
            : has(body, "location") && primaryLanguage !== "en" ? optional(body.location, 300) : profile.addressAr,
          addressEn: has(body, "addressEn")
            ? optional(body.addressEn, 500)
            : has(body, "location") && primaryLanguage === "en" ? optional(body.location, 300) : profile.addressEn,
          avatarUrl: patched(body, "avatarUrl", profile.avatarUrl, 2048),
          coverUrl: patched(body, "coverUrl", profile.coverUrl, 2048),
          logoUrl: patched(body, "logoUrl", profile.logoUrl, 2048),
          draftRevision: { increment: 1 },
        },
      });
      if (profile.virtualCard) {
        const label = optional(body.cardName, 120) || displayName;
        await tx.virtualCard.update({
          where: { id: profile.virtualCard.id },
          data: { name: label, displayLabel: label, ...(type === "ORGANIZATION" ? { type: "BUSINESS" as const } : {}) },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROFILE_UPDATE_FAILED";
    const forbidden = ["BUSINESS_CARD_PLAN_REQUIRED", "THEME_NOT_ALLOWED"].includes(code);
    const notFound = code === "PROFILE_NOT_FOUND";
    return Response.json({ ok: false, error: code }, { status: notFound ? 404 : forbidden ? 403 : 400 });
  }
}
