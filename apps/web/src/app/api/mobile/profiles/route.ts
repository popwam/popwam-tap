import { DestinationType, Prisma, prisma } from "@popwam/db";
import { defaultIconKeys, safeIconKey } from "@popwam/shared";
import { ensureFigmaTemplates } from "@/lib/figma-templates";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { assertWithinLimitLocked, getUserEntitlements } from "@/lib/plans";
import { normalizeAndValidate } from "@/lib/url";
import { canCreateVirtualCard, profileTypeForVirtualCard, templateAllowed, VIRTUAL_CARD_TYPES, type VirtualCardTypeValue } from "@/lib/virtual-cards";
import { googleWalletConfigured } from "@/lib/wallet";
import { initializeDefaultModules } from "@/lib/profile-domain";
import { mobileProfileInclude, mobileProfileOwnerDto } from "@/lib/mobile-profile-dto";
import { normalizeProfilePhone } from "@/lib/url";

const optional = (value: unknown) => String(value || "").trim() || null;

type LinkInput = { type?: unknown; url?: unknown; titleAr?: unknown; titleEn?: unknown; iconKey?: unknown };

function parseLinks(value: unknown, countryIso2?: string | null) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((raw, sortOrder) => {
    const item = (raw && typeof raw === "object" ? raw : {}) as LinkInput;
    const type = String(item.type || "CUSTOM_URL") as DestinationType;
    if (!Object.values(DestinationType).includes(type) || type === "PROFILE" || type === "VCF") throw new Error("DESTINATION_INVALID");
    const rawUrl = String(item.url || "").trim();
    if (rawUrl.length > 2048) throw new Error("DESTINATION_URL_INVALID");
    const normalized = normalizeAndValidate(type, rawUrl, countryIso2);
    if (!normalized.valid) throw new Error("DESTINATION_URL_INVALID");
    const titleAr = optional(item.titleAr);
    const titleEn = optional(item.titleEn);
    if ((titleAr?.length || 0) > 120 || (titleEn?.length || 0) > 120) throw new Error("DESTINATION_TITLE_INVALID");
    const title = titleAr || titleEn;
    if (!title) throw new Error("DESTINATION_TITLE_REQUIRED");
    return { type, url: normalized.url, title, titleAr, titleEn, iconKey: safeIconKey(String(item.iconKey || ""), defaultIconKeys[type]), sortOrder: sortOrder + 2 };
  });
}

export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  await ensureFigmaTemplates();
  const [{ effective }, profiles] = await Promise.all([
    getUserEntitlements(user.id),
    prisma.profile.findMany({
      where: { userId: user.id, archivedAt: null, lifecycle: { not: "ARCHIVED" } },
      include: mobileProfileInclude,
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return Response.json({
    ok: true,
    wallet: {
      googleConfigured: googleWalletConfigured(),
      googleAvailable: Boolean(effective.allowWalletPasses) && googleWalletConfigured(),
    },
    profiles: profiles.map(mobileProfileOwnerDto),
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  await ensureFigmaTemplates();
  const body = await request.json().catch(() => ({}));
  const lengthLimits: Array<[string, number]> = [
    ["displayNameAr", 120], ["displayNameEn", 120], ["cardName", 120], ["profileLabel", 80],
    ["jobTitleAr", 120], ["jobTitleEn", 120], ["company", 160], ["bioAr", 2000], ["bioEn", 2000],
    ["email", 254], ["phone", 64], ["website", 2048], ["location", 300],
  ];
  if (lengthLimits.some(([key, maximum]) => String(body[key] || "").trim().length > maximum)) {
    return Response.json({ ok: false, error: "FIELD_TOO_LONG" }, { status: 400 });
  }
  const cardType = String(body.cardType || (body.type === "ORGANIZATION" ? "BUSINESS" : body.type) || "PERSONAL") as VirtualCardTypeValue;
  if (!VIRTUAL_CARD_TYPES.includes(cardType)) return Response.json({ ok: false, error: "VIRTUAL_CARD_TYPE_INVALID" }, { status: 400 });
  const primaryLanguage = body.primaryLanguage === undefined ? "ar" : String(body.primaryLanguage);
  if (primaryLanguage !== "ar" && primaryLanguage !== "en") return Response.json({ ok: false, error: "LANGUAGE_INVALID" }, { status: 400 });
  const displayName = String(body.displayNameAr || body.displayNameEn || "").trim();
  const cardName = String(body.cardName || displayName).trim();
  if (!displayName) return Response.json({ ok: false, error: "PROFILE_NAME_REQUIRED" }, { status: 400 });
  if (!cardName) return Response.json({ ok: false, error: "CARD_NAME_REQUIRED" }, { status: 400 });
  const countryIso2 = optional(body.countryIso2);
  let links: ReturnType<typeof parseLinks>;
  try { links = parseLinks(body.links, countryIso2); } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "DESTINATION_INVALID" }, { status: 400 });
  }
  const rawPhone = optional(body.phone);
  const phone = rawPhone ? normalizeProfilePhone(rawPhone, countryIso2) : null;
  if (rawPhone && !phone) return Response.json({ ok: false, error: "PHONE_INVALID" }, { status: 400 });
  const rawEmail = optional(body.email);
  const email = rawEmail?.toLowerCase() || null;
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return Response.json({ ok: false, error: "EMAIL_INVALID" }, { status: 400 });
  }
  const rawWebsite = optional(body.website);
  const websiteResult = rawWebsite ? normalizeAndValidate("WEBSITE", rawWebsite) : { url: null, valid: true };
  if (!websiteResult.valid) return Response.json({ ok: false, error: "URL_INVALID" }, { status: 400 });
  try {
    const profileId = await prisma.$transaction(async tx => {
      const bootstrap = await tx.virtualCard.findFirst({
        where: { userId: user.id, isDefault: true, themeId: null },
        include: { profile: { include: { destinations: { select: { type: true } } } } },
      });
      const reusableBootstrap = Boolean(
        bootstrap
        && bootstrap.name === bootstrap.profile.displayName
        && bootstrap.profile.displayName === user.name
        && !bootstrap.profile.jobTitleAr
        && !bootstrap.profile.jobTitleEn
        && !bootstrap.profile.company
        && !bootstrap.profile.bioAr
        && !bootstrap.profile.bioEn
        && !bootstrap.profile.website
        && !bootstrap.profile.phone
        && bootstrap.profile.destinations.every(destination => destination.type === "PROFILE" || destination.type === "VCF"),
      );
      const { effective, used, plan } = await assertWithinLimitLocked(tx, user.id, "virtualCards", reusableBootstrap ? 0 : 1);
      if (!reusableBootstrap) await assertWithinLimitLocked(tx, user.id, "profiles");
      if (links.length) await assertWithinLimitLocked(tx, user.id, "links", links.length);
      const decision = canCreateVirtualCard(
        { maxVirtualCards: Number(effective.maxVirtualCards), allowBusinessCards: Boolean(effective.allowBusinessCards) },
        reusableBootstrap ? Math.max(0, used - 1) : used,
        cardType,
      );
      if (!decision.allowed) throw new Error(decision.reason);
      const template = body.templateId
        ? await tx.profileTemplate.findFirst({ where: { id: String(body.templateId), isActive: true } })
        : await tx.profileTemplate.findFirst({ where: { isActive: true, minimumPlan: "free" }, orderBy: { sortOrder: "asc" } });
      if (!template) throw new Error("TEMPLATE_NOT_FOUND");
      if (!templateAllowed(plan.slug, template.minimumPlan)) throw new Error("TEMPLATE_PLAN_REQUIRED");
      const type = profileTypeForVirtualCard(cardType);
      const profileData = {
        type,
        profileKind: type === "ORGANIZATION" ? "BUSINESS" as const : "PERSONAL" as const,
        lifecycle: "DRAFT" as const,
        access: "PRIVATE" as const,
        isPublic: false,
        categoryId: template.categoryId,
        templateId: template.id,
        displayName,
        displayLabel: optional(body.profileLabel) || cardName,
        displayNameAr: optional(body.displayNameAr),
        displayNameEn: optional(body.displayNameEn),
        organizationNameAr: type === "ORGANIZATION" ? optional(body.displayNameAr) : null,
        organizationNameEn: type === "ORGANIZATION" ? optional(body.displayNameEn) : null,
        primaryLanguage,
        jobTitleAr: optional(body.jobTitleAr),
        jobTitleEn: optional(body.jobTitleEn),
        company: optional(body.company),
        bioAr: type === "ORGANIZATION" ? null : optional(body.bioAr),
        bioEn: type === "ORGANIZATION" ? null : optional(body.bioEn),
        descriptionAr: type === "ORGANIZATION" ? optional(body.bioAr) : null,
        descriptionEn: type === "ORGANIZATION" ? optional(body.bioEn) : null,
        phone,
        email,
        website: websiteResult.url,
        locationText: optional(body.location),
        addressAr: primaryLanguage === "ar" ? optional(body.location) : null,
        addressEn: primaryLanguage === "en" ? optional(body.location) : null,
      };
      if (reusableBootstrap && bootstrap) {
        await tx.profile.update({ where: { id: bootstrap.profileId }, data: profileData });
        await initializeDefaultModules(tx, bootstrap.profileId, template.id);
        await tx.virtualCard.update({ where: { id: bootstrap.id }, data: { name: cardName, displayLabel:cardName, type: cardType, themeId: template.id, status: "ACTIVE" } });
        await tx.destination.deleteMany({ where: { profileId: bootstrap.profileId, type: { notIn: ["PROFILE", "VCF"] } } });
        if (links.length) await tx.destination.createMany({ data: links.map(link => ({ ...link, userId: user.id, profileId: bootstrap.profileId })) });
        return bootstrap.profileId;
      }
      const created = await tx.profile.create({ data: { userId: user.id, ...profileData } });
      await initializeDefaultModules(tx, created.id, template.id);
      await tx.virtualCard.create({ data: { userId: user.id, name: cardName, displayLabel:cardName, type: cardType, profileId: created.id, themeId: template.id, isDefault: used === 0 } });
      await tx.destination.createMany({ data: [
        { userId: user.id, profileId: created.id, type: "PROFILE", title: "Public profile", titleAr: "الملف العام", titleEn: "Public profile", url: `/p/id/${created.id}`, iconKey: "profile", sortOrder: 0 },
        { userId: user.id, profileId: created.id, type: "VCF", title: "Save contact", titleAr: "حفظ جهة الاتصال", titleEn: "Save Contact", url: `/api/profiles/${created.id}/contact.vcf`, iconKey: "contact", sortOrder: 1 },
        ...links.map(link => ({ ...link, userId: user.id, profileId: created.id })),
      ] });
      return created.id;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 30_000,
    });
    const profile = await prisma.profile.findUnique({ where: { id: profileId }, include: mobileProfileInclude });
    return Response.json({ ok: true, profile: profile ? mobileProfileOwnerDto(profile) : null }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["BUSINESS_CARD_PLAN_REQUIRED", "VIRTUAL_CARD_LIMIT_REACHED", "TEMPLATE_PLAN_REQUIRED"].includes(code)) return Response.json({ ok: false, error: code }, { status: 403 });
    if (code === "LIMIT_REACHED:virtualCards" || code === "LIMIT_REACHED:profiles") return Response.json({ ok: false, error: "VIRTUAL_CARD_LIMIT_REACHED" }, { status: 403 });
    if (code === "LIMIT_REACHED:links") return Response.json({ ok: false, error: "LINK_LIMIT_REACHED" }, { status: 403 });
    if (code === "TEMPLATE_NOT_FOUND") return Response.json({ ok: false, error: code }, { status: 400 });
    console.error("mobile profile creation failed", { operation: "mobile.profile.create", userId: user.id, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ ok: false, error: "PROFILE_CREATE_FAILED" }, { status: 500 });
  }
}
