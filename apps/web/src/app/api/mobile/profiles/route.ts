import { DestinationType, Prisma, prisma } from "@popwam/db";
import { defaultIconKeys, safeIconKey } from "@popwam/shared";
import { ensureFigmaTemplates } from "@/lib/figma-templates";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { assertWithinLimitLocked, getUserEntitlements } from "@/lib/plans";
import { normalizeAndValidate } from "@/lib/url";
import { canCreateVirtualCard, profileTypeForVirtualCard, templateAllowed, VIRTUAL_CARD_TYPES, type VirtualCardTypeValue } from "@/lib/virtual-cards";
import { googleWalletConfigured } from "@/lib/wallet";

const optional = (value: unknown) => String(value || "").trim() || null;

type LinkInput = { type?: unknown; url?: unknown; titleAr?: unknown; titleEn?: unknown; iconKey?: unknown };

function parseLinks(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((raw, sortOrder) => {
    const item = (raw && typeof raw === "object" ? raw : {}) as LinkInput;
    const type = String(item.type || "CUSTOM_URL") as DestinationType;
    if (!Object.values(DestinationType).includes(type) || type === "PROFILE" || type === "VCF") throw new Error("DESTINATION_INVALID");
    const normalized = normalizeAndValidate(type, String(item.url || ""));
    if (!normalized.valid) throw new Error("DESTINATION_URL_INVALID");
    const titleAr = optional(item.titleAr);
    const titleEn = optional(item.titleEn);
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
      where: { userId: user.id },
      include: {
        destinations: { orderBy: { sortOrder: "asc" } },
        uploads: { orderBy: { sortOrder: "asc" } },
        services: { orderBy: { sortOrder: "asc" } },
        branches: { orderBy: { sortOrder: "asc" } },
        virtualCard: { include: { template: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return Response.json({
    ok: true,
    wallet: {
      googleConfigured: googleWalletConfigured(),
      googleAvailable: Boolean(effective.allowWalletPasses) && googleWalletConfigured(),
    },
    profiles: profiles.map(profile => ({
      ...profile,
      uploads: profile.uploads.map(file => ({ ...file, sizeBytes: file.sizeBytes.toString() })),
    })),
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  await ensureFigmaTemplates();
  const body = await request.json().catch(() => ({}));
  const cardType = String(body.cardType || (body.type === "ORGANIZATION" ? "BUSINESS" : body.type) || "PERSONAL") as VirtualCardTypeValue;
  if (!VIRTUAL_CARD_TYPES.includes(cardType)) return Response.json({ ok: false, error: "VIRTUAL_CARD_TYPE_INVALID" }, { status: 400 });
  const displayName = String(body.displayNameAr || body.displayNameEn || "").trim();
  const cardName = String(body.cardName || displayName).trim();
  if (!displayName) return Response.json({ ok: false, error: "PROFILE_NAME_REQUIRED" }, { status: 400 });
  if (!cardName) return Response.json({ ok: false, error: "CARD_NAME_REQUIRED" }, { status: 400 });
  let links: ReturnType<typeof parseLinks>;
  try { links = parseLinks(body.links); } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "DESTINATION_INVALID" }, { status: 400 });
  }
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
        displayName,
        displayNameAr: optional(body.displayNameAr),
        displayNameEn: optional(body.displayNameEn),
        organizationNameAr: type === "ORGANIZATION" ? optional(body.displayNameAr) : null,
        organizationNameEn: type === "ORGANIZATION" ? optional(body.displayNameEn) : null,
        primaryLanguage: body.primaryLanguage === "en" ? "en" : "ar",
        jobTitleAr: optional(body.jobTitleAr),
        jobTitleEn: optional(body.jobTitleEn),
        company: optional(body.company),
        bioAr: type === "ORGANIZATION" ? null : optional(body.bioAr),
        bioEn: type === "ORGANIZATION" ? null : optional(body.bioEn),
        descriptionAr: type === "ORGANIZATION" ? optional(body.bioAr) : null,
        descriptionEn: type === "ORGANIZATION" ? optional(body.bioEn) : null,
        phone: optional(body.phone),
        email: optional(body.email) || user.email,
        website: optional(body.website),
        locationText: optional(body.location),
        addressAr: body.primaryLanguage === "ar" ? optional(body.location) : null,
        addressEn: body.primaryLanguage === "en" ? optional(body.location) : null,
      };
      if (reusableBootstrap && bootstrap) {
        await tx.profile.update({ where: { id: bootstrap.profileId }, data: profileData });
        await tx.virtualCard.update({ where: { id: bootstrap.id }, data: { name: cardName, type: cardType, themeId: template.id, status: "ACTIVE" } });
        await tx.destination.deleteMany({ where: { profileId: bootstrap.profileId, type: { notIn: ["PROFILE", "VCF"] } } });
        if (links.length) await tx.destination.createMany({ data: links.map(link => ({ ...link, userId: user.id, profileId: bootstrap.profileId })) });
        return bootstrap.profileId;
      }
      const created = await tx.profile.create({ data: { userId: user.id, ...profileData } });
      await tx.virtualCard.create({ data: { userId: user.id, name: cardName, type: cardType, profileId: created.id, themeId: template.id, isDefault: used === 0 } });
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
    const profile = await prisma.profile.findUnique({ where: { id: profileId }, include: { destinations: { orderBy: { sortOrder: "asc" } }, uploads: true, virtualCard: { include: { template: true } } } });
    return Response.json({ ok: true, profile }, { status: 201, headers: { "cache-control": "no-store" } });
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
