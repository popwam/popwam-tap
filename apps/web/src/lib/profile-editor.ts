import {
  DestinationType,
  OrgRole,
  Prisma,
  ProfileModuleVisibility,
  prisma,
} from "@popwam/db";
import { assertWithinLimitLocked, getUserEntitlements } from "./plans";
import { buildOwnerPreviewProjection } from "./profile-preview";
import {
  evaluateProfileReadiness,
  getOwnedDraft,
  loadPublishedRevision,
  managedProfileWhere,
  type DraftProfileData,
  type PublishedRevisionData,
} from "./profile-publishing";
import { normalizeAndValidate } from "./url";

export const PROFILE_EDITOR_MODULE_KEYS = [
  "IDENTITY",
  "ABOUT",
  "CONTACT",
  "SOCIAL",
  "LINKS",
  "SERVICES",
  "PORTFOLIO",
  "GALLERY",
  "BRANCHES",
] as const;

export type ProfileEditorModuleKey = (typeof PROFILE_EDITOR_MODULE_KEYS)[number];
const editorKeys = new Set<string>(PROFILE_EDITOR_MODULE_KEYS);
const visibilityValues = new Set<ProfileModuleVisibility>(["PUBLIC", "FRIENDS", "ONLY_ME"]);
const editableDestinationTypes = new Set<DestinationType>([
  "WHATSAPP_BUSINESS", "WHATSAPP_PRIVATE", "PHONE", "EMAIL", "WEBSITE",
  "FACEBOOK", "LINKEDIN", "GITHUB", "TIKTOK", "INSTAGRAM", "X", "YOUTUBE",
  "TELEGRAM", "LOCATION", "SOCIAL", "CUSTOM_URL",
]);

type Tx = Prisma.TransactionClient;
type EditorLocale = "ar" | "en";

export type ProfileEditorAction =
  | { type: "IDENTITY_SAVE"; displayLabel?: unknown; displayName?: unknown; displayNameAr?: unknown; displayNameEn?: unknown; jobTitleAr?: unknown; jobTitleEn?: unknown; organizationNameAr?: unknown; organizationNameEn?: unknown; primaryLanguage?: unknown }
  | { type: "ABOUT_SAVE"; title?: unknown; bio?: unknown; bioAr?: unknown; bioEn?: unknown; descriptionAr?: unknown; descriptionEn?: unknown }
  | { type: "CONTACT_SAVE"; phone?: unknown; alternatePhone?: unknown; email?: unknown; website?: unknown; whatsappBusiness?: unknown; whatsappPrivate?: unknown; locationText?: unknown; addressAr?: unknown; addressEn?: unknown; visibility?: unknown }
  | { type: "LINK_UPSERT"; id?: unknown; title?: unknown; titleAr?: unknown; titleEn?: unknown; destinationType?: unknown; url?: unknown; visibility?: unknown }
  | { type: "LINK_DELETE"; id?: unknown }
  | { type: "LINK_REORDER"; ids?: unknown }
  | { type: "SERVICE_UPSERT"; id?: unknown; nameAr?: unknown; nameEn?: unknown; descriptionAr?: unknown; descriptionEn?: unknown; url?: unknown; visibility?: unknown }
  | { type: "SERVICE_DELETE"; id?: unknown }
  | { type: "SERVICE_REORDER"; ids?: unknown }
  | { type: "BRANCH_UPSERT"; id?: unknown; nameAr?: unknown; nameEn?: unknown; addressAr?: unknown; addressEn?: unknown; phone?: unknown; mapUrl?: unknown; visibility?: unknown }
  | { type: "BRANCH_DELETE"; id?: unknown }
  | { type: "BRANCH_REORDER"; ids?: unknown }
  | { type: "MODULE_ADD"; key?: unknown }
  | { type: "MODULE_UPDATE"; key?: unknown; enabled?: unknown; visibility?: unknown }
  | { type: "MODULE_REORDER"; keys?: unknown }
  | { type: "MEDIA_VISIBILITY"; id?: unknown; visibility?: unknown }
  | { type: "MEDIA_REORDER"; ids?: unknown };

function bounded(value: unknown, maximum: number, required = false) {
  const result = String(value ?? "").trim();
  if (required && !result) throw new Error("FIELD_REQUIRED");
  if (result.length > maximum) throw new Error("FIELD_TOO_LONG");
  return result || null;
}

function requiredId(value: unknown) {
  const id = bounded(value, 64, true);
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("ITEM_ID_INVALID");
  return id;
}

function uniqueStringList(value: unknown, maximum = 50) {
  if (!Array.isArray(value) || value.length > maximum) throw new Error("ORDER_INVALID");
  const ids = value.map(requiredId);
  if (new Set(ids).size !== ids.length) throw new Error("ORDER_INVALID");
  return ids;
}

function booleanVisibility(value: unknown) {
  if (value === "PUBLIC" || value === true) return true;
  if (value === "ONLY_ME" || value === false) return false;
  throw new Error("VISIBILITY_INVALID");
}

function audience(value: unknown) {
  const candidate = String(value || "") as ProfileModuleVisibility;
  if (!visibilityValues.has(candidate)) throw new Error("VISIBILITY_INVALID");
  return candidate;
}

function safeHttpUrl(value: unknown, required = false) {
  const raw = bounded(value, 2048, required);
  if (!raw) return null;
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new Error("URL_INVALID"); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("URL_INVALID");
  return parsed.toString();
}

function editorCanManage(profile: { userId: string; organization?: { memberships: Array<{ role: string }> } | null }, userId: string) {
  const role = profile.organization?.memberships[0]?.role;
  return profile.userId === userId || role === OrgRole.OWNER || role === OrgRole.ORG_ADMIN;
}

export function profileEditorMutationDecision(input: {
  currentRevision: number;
  expectedRevision: number;
  lifecycle: string;
  canManage: boolean;
}) {
  if (!input.canManage) return { allowed: false, error: "PROFILE_NOT_FOUND" } as const;
  if (input.lifecycle === "ARCHIVED") return { allowed: false, error: "PROFILE_ARCHIVED" } as const;
  if (input.currentRevision !== input.expectedRevision) return { allowed: false, error: "STALE_DRAFT" } as const;
  return { allowed: true } as const;
}

export function moduleUpdateDecision(input: {
  key: string;
  supported: boolean;
  allowed: boolean;
  required: boolean;
  enabled: boolean;
}) {
  if (!input.supported) return { allowed: false, error: "MODULE_UNSUPPORTED" } as const;
  if (!input.allowed) return { allowed: false, error: "MODULE_NOT_ALLOWED" } as const;
  if (input.required && !input.enabled) return { allowed: false, error: "MODULE_REQUIRED" } as const;
  return { allowed: true } as const;
}

function same(value: unknown) {
  return JSON.stringify(value);
}

export function changedEditorSections(profile: DraftProfileData, published: PublishedRevisionData | null) {
  if (!published) return profile.modules.map((module) => module.moduleDefinition.key);
  const changed = new Set<string>();
  if (same([
    profile.displayName, profile.displayLabel, profile.displayNameAr, profile.displayNameEn,
    profile.jobTitleAr, profile.jobTitleEn, profile.organizationNameAr, profile.organizationNameEn,
    profile.avatarUrl, profile.logoUrl, profile.coverUrl,
  ]) !== same([
    published.displayName, published.displayLabel, published.displayNameAr, published.displayNameEn,
    published.jobTitleAr, published.jobTitleEn, published.organizationNameAr, published.organizationNameEn,
    published.avatarUrl, published.logoUrl, published.coverUrl,
  ])) changed.add("IDENTITY");
  if (same([profile.title, profile.bio, profile.bioAr, profile.bioEn, profile.descriptionAr, profile.descriptionEn])
    !== same([published.title, published.bio, published.bioAr, published.bioEn, published.descriptionAr, published.descriptionEn])) changed.add("ABOUT");
  if (same([
    profile.phone, profile.alternatePhone, profile.email, profile.website, profile.whatsappBusiness,
    profile.whatsappPrivate, profile.locationText, profile.addressAr, profile.addressEn,
    profile.showPhone, profile.showEmail, profile.showWebsite, profile.showWhatsappBusiness,
    profile.showWhatsappPrivate, profile.showLocation,
  ]) !== same([
    published.phone, published.alternatePhone, published.email, published.website, published.whatsappBusiness,
    published.whatsappPrivate, published.locationText, published.addressAr, published.addressEn,
    published.showPhone, published.showEmail, published.showWebsite, published.showWhatsappBusiness,
    published.showWhatsappPrivate, published.showLocation,
  ])) changed.add("CONTACT");
  const draftLinks = profile.destinations.map((item) => [item.id, item.title, item.titleAr, item.titleEn, item.type, item.url, item.isVisible, item.sortOrder]);
  const publicLinks = published.destinations.map((item) => [item.sourceId, item.title, item.titleAr, item.titleEn, item.type, item.url, true, item.sortOrder]);
  if (same(draftLinks) !== same(publicLinks)) { changed.add("LINKS"); changed.add("SOCIAL"); }
  if (same(profile.services.map((item) => [item.id, item.nameAr, item.nameEn, item.descriptionAr, item.descriptionEn, item.url, item.isVisible, item.sortOrder]))
    !== same(published.services.map((item) => [item.sourceId, item.nameAr, item.nameEn, item.descriptionAr, item.descriptionEn, item.url, true, item.sortOrder]))) changed.add("SERVICES");
  if (same(profile.branches.map((item) => [item.id, item.nameAr, item.nameEn, item.addressAr, item.addressEn, item.phone, item.mapUrl, item.isVisible, item.sortOrder]))
    !== same(published.branches.map((item) => [item.sourceId, item.nameAr, item.nameEn, item.addressAr, item.addressEn, item.phone, item.mapUrl, true, item.sortOrder]))) changed.add("BRANCHES");
  if (same(profile.mediaAssets.map((item) => [item.id, item.purpose, item.visibility, item.sortOrder]))
    !== same(published.media.map((item) => [item.mediaId, item.purpose, "PUBLIC", item.sortOrder]))) changed.add("GALLERY");
  const publishedModules = new Map(published.modules.map((item) => [item.key, item]));
  for (const module of profile.modules) {
    const previous = publishedModules.get(module.moduleDefinition.key);
    if (!previous || same([module.enabled, module.visibility, module.sortOrder, module.configuration])
      !== same([previous.enabled, previous.visibility, previous.sortOrder, previous.configuration])) changed.add(module.moduleDefinition.key);
  }
  return [...changed];
}

export async function getProfileSelector(userId: string, selectedProfileId?: string | null) {
  const now = new Date();
  const [{ effective, plan }, profiles, ownedUsage, grants] = await Promise.all([
    getUserEntitlements(userId),
    prisma.profile.findMany({
      where: {
        lifecycle: { not: "ARCHIVED" },
        OR: [
          { userId },
          { organization: { memberships: { some: { userId, role: { in: [OrgRole.OWNER, OrgRole.ORG_ADMIN] } } } } },
        ],
      },
      select: {
        id: true, displayLabel: true, displayName: true, profileKind: true, type: true,
        lifecycle: true, isPrimary: true, category: { select: { slug: true } },
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    }),
    prisma.profile.count({ where: { userId } }),
    prisma.profileEntitlement.aggregate({
      where: { userId, status: "ACTIVE", startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      _sum: { profileLimitIncrement: true },
    }),
  ]);
  const limit = Number(effective.maxProfiles) + (grants._sum.profileLimitIncrement || 0);
  const selected = profiles.some((profile) => profile.id === selectedProfileId)
    ? selectedProfileId!
    : profiles.find((profile) => profile.isPrimary)?.id || profiles[0]?.id || null;
  return {
    profiles: profiles.map((profile) => ({
      id: profile.id,
      label: profile.displayLabel || profile.displayName,
      publicName: profile.displayName,
      profileKind: profile.profileKind || (profile.type === "ORGANIZATION" ? "BUSINESS" : "PERSONAL"),
      categoryKey: profile.category?.slug || null,
      lifecycle: profile.lifecycle,
      isPrimary: profile.isPrimary,
    })),
    selectedProfileId: selected,
    quota: {
      used: ownedUsage,
      limit,
      remaining: Math.max(0, limit - ownedUsage),
      planSlug: plan.slug,
      quotaAllowsAdditional: ownedUsage < limit,
      onboardingSupported: false,
      blocker: "ONBOARDING_PROGRESS_USER_SCOPED",
    },
  };
}

function localized(locale: EditorLocale, ar: string | null, en: string | null, fallback = "") {
  return (locale === "ar" ? ar || en : en || ar) || fallback;
}

export async function getProfileEditor(userId: string, profileId: string, locale: EditorLocale) {
  const profile = await getOwnedDraft(userId, profileId);
  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  const published = await loadPublishedRevision(profileId);
  const required = new Set([
    "IDENTITY",
    ...(profile.template?.moduleRules.filter((rule) => rule.required).map((rule) => rule.moduleDefinition.key) || []),
  ]);
  const allowedRules = new Map(profile.template?.moduleRules.map((rule) => [rule.moduleDefinition.key, rule]) || []);
  const definitions = await prisma.profileModuleDefinition.findMany({
    where: { isActive: true, key: { in: [...PROFILE_EDITOR_MODULE_KEYS] } },
    orderBy: { key: "asc" },
  });
  const instances = new Map(profile.modules.map((module) => [module.moduleDefinition.key, module]));
  const addableModules = definitions
    .filter((definition) => !instances.has(definition.key))
    .filter((definition) => !profile.templateId || allowedRules.get(definition.key)?.allowed)
    .map((definition) => ({ key: definition.key, name: localized(locale, definition.nameAr, definition.nameEn, definition.key) }));
  const changedSections = changedEditorSections(profile, published);
  const readiness = evaluateProfileReadiness(profile);
  return {
    ok: true,
    profile: {
      id: profile.id,
      label: profile.displayLabel || profile.displayName,
      displayLabel: profile.displayLabel || "",
      displayName: profile.displayName,
      displayNameAr: profile.displayNameAr,
      displayNameEn: profile.displayNameEn,
      profileKind: profile.profileKind || (profile.type === "ORGANIZATION" ? "BUSINESS" : "PERSONAL"),
      categoryKey: profile.category?.slug || null,
      lifecycle: profile.lifecycle,
      access: profile.access,
      isPrimary: profile.isPrimary,
      draftRevision: profile.draftRevision,
      publishedRevision: published?.revisionNumber || null,
      draftChanged: published ? changedSections.length > 0 : true,
      changedSections,
      primaryLanguage: profile.primaryLanguage,
    },
    permissions: { canEdit: true, canSetPrimary: false },
    readiness,
    preview: buildOwnerPreviewProjection(profile, locale),
    identity: {
      displayLabel: profile.displayLabel || "",
      displayName: profile.displayName,
      displayNameAr: profile.displayNameAr || "",
      displayNameEn: profile.displayNameEn || "",
      jobTitleAr: profile.jobTitleAr || "",
      jobTitleEn: profile.jobTitleEn || "",
      organizationNameAr: profile.organizationNameAr || "",
      organizationNameEn: profile.organizationNameEn || "",
      primaryLanguage: profile.primaryLanguage,
    },
    about: {
      title: profile.title || "",
      bio: profile.bio || "",
      bioAr: profile.bioAr || "",
      bioEn: profile.bioEn || "",
      descriptionAr: profile.descriptionAr || "",
      descriptionEn: profile.descriptionEn || "",
    },
    contact: {
      phone: profile.phone || "",
      alternatePhone: profile.alternatePhone || "",
      email: profile.email || "",
      website: profile.website || "",
      whatsappBusiness: profile.whatsappBusiness || "",
      whatsappPrivate: profile.whatsappPrivate || "",
      locationText: profile.locationText || "",
      addressAr: profile.addressAr || "",
      addressEn: profile.addressEn || "",
      visibility: {
        phone: profile.showPhone ? "PUBLIC" : "ONLY_ME",
        email: profile.showEmail ? "PUBLIC" : "ONLY_ME",
        website: profile.showWebsite ? "PUBLIC" : "ONLY_ME",
        whatsappBusiness: profile.showWhatsappBusiness ? "PUBLIC" : "ONLY_ME",
        whatsappPrivate: profile.showWhatsappPrivate ? "PUBLIC" : "ONLY_ME",
        location: profile.showLocation ? "PUBLIC" : "ONLY_ME",
      },
    },
    links: profile.destinations
      .filter((item) => item.type !== "PROFILE" && item.type !== "VCF" && item.type !== "FILE")
      .map((item) => ({ id: item.id, title: localized(locale, item.titleAr, item.titleEn, item.title), titleAr: item.titleAr || "", titleEn: item.titleEn || "", type: item.type, url: item.url, visibility: item.isVisible ? "PUBLIC" : "ONLY_ME", sortOrder: item.sortOrder })),
    services: profile.services.map((item) => ({ ...item, name: localized(locale, item.nameAr, item.nameEn), description: localized(locale, item.descriptionAr, item.descriptionEn), visibility: item.isVisible ? "PUBLIC" : "ONLY_ME" })),
    branches: profile.branches.map((item) => ({ ...item, name: localized(locale, item.nameAr, item.nameEn), address: localized(locale, item.addressAr, item.addressEn), visibility: item.isVisible ? "PUBLIC" : "ONLY_ME" })),
    media: profile.mediaAssets.map((item) => ({ id: item.id, purpose: item.purpose, visibility: item.visibility, sortOrder: item.sortOrder, previewUrl: `/api/profiles/${profile.id}/media/${item.id}` })),
    modules: profile.modules.map((module) => ({
      id: module.id,
      key: module.moduleDefinition.key,
      name: localized(locale, module.moduleDefinition.nameAr, module.moduleDefinition.nameEn, module.moduleDefinition.key),
      enabled: module.enabled,
      visibility: module.visibility,
      sortOrder: module.sortOrder,
      required: required.has(module.moduleDefinition.key),
      supported: editorKeys.has(module.moduleDefinition.key),
      modified: changedSections.includes(module.moduleDefinition.key),
    })),
    addableModules,
  };
}

async function loadLockedProfile(tx: Tx, userId: string, profileId: string, expectedRevision: number) {
  const authorized = await tx.profile.findFirst({
    where: managedProfileWhere(userId, profileId),
    include: {
      organization: { select: { memberships: { where: { userId }, select: { role: true } } } },
      template: { include: { moduleRules: { include: { moduleDefinition: true } } } },
      modules: { include: { moduleDefinition: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!authorized || !editorCanManage(authorized, userId)) throw new Error("PROFILE_NOT_FOUND");
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Profile" WHERE "id" = ${profileId} FOR UPDATE`);
  const current = await tx.profile.findUnique({ where: { id: profileId }, select: { draftRevision: true, lifecycle: true } });
  const decision = profileEditorMutationDecision({
    currentRevision: current?.draftRevision ?? -1,
    expectedRevision,
    lifecycle: current?.lifecycle || "ARCHIVED",
    canManage: Boolean(current),
  });
  if (!decision.allowed) throw new Error(decision.error);
  return authorized;
}

async function reorderExact(tx: Tx, model: "destination" | "profileService" | "profileBranch" | "profileMediaAsset", profileId: string, ids: string[]) {
  const rows = model === "destination"
    ? await tx.destination.findMany({ where: { profileId, id: { in: ids }, type: { notIn: ["PROFILE", "VCF", "FILE"] } }, select: { id: true } })
    : model === "profileService"
      ? await tx.profileService.findMany({ where: { profileId, id: { in: ids } }, select: { id: true } })
      : model === "profileBranch"
        ? await tx.profileBranch.findMany({ where: { profileId, id: { in: ids } }, select: { id: true } })
        : await tx.profileMediaAsset.findMany({ where: { profileId, id: { in: ids }, state: { in: ["DRAFT_ATTACHED", "PUBLISHED"] } }, select: { id: true } });
  if (rows.length !== ids.length) throw new Error("ORDER_INVALID");
  for (const [index, id] of ids.entries()) {
    if (model === "destination") await tx.destination.update({ where: { id }, data: { sortOrder: index * 10 } });
    else if (model === "profileService") await tx.profileService.update({ where: { id }, data: { sortOrder: index * 10 } });
    else if (model === "profileBranch") await tx.profileBranch.update({ where: { id }, data: { sortOrder: index * 10 } });
    else await tx.profileMediaAsset.update({ where: { id }, data: { sortOrder: index * 10 } });
  }
}

export async function mutateProfileEditor(userId: string, profileId: string, expectedRevision: number, action: ProfileEditorAction) {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new Error("DRAFT_REVISION_REQUIRED");
  if (!action || typeof action !== "object" || !("type" in action)) throw new Error("ACTION_INVALID");
  return prisma.$transaction(async (tx) => {
    const profile = await loadLockedProfile(tx, userId, profileId, expectedRevision);
    const requiredKeys = new Set([
      "IDENTITY",
      ...(profile.template?.moduleRules.filter((rule) => rule.required).map((rule) => rule.moduleDefinition.key) || []),
    ]);
    let auditOperation: string | null = null;
    let auditTarget = profileId;
    let auditMetadata: Prisma.InputJsonObject | undefined;

    switch (action.type) {
      case "IDENTITY_SAVE": {
        const displayName = bounded(action.displayName, 120, true)!;
        const displayLabel = bounded(action.displayLabel, 80);
        await tx.profile.update({
          where: { id: profileId },
          data: {
            displayName,
            displayLabel,
            displayNameAr: bounded(action.displayNameAr, 120),
            displayNameEn: bounded(action.displayNameEn, 120),
            jobTitleAr: bounded(action.jobTitleAr, 120),
            jobTitleEn: bounded(action.jobTitleEn, 120),
            organizationNameAr: profile.profileKind === "BUSINESS" ? bounded(action.organizationNameAr, 120) : null,
            organizationNameEn: profile.profileKind === "BUSINESS" ? bounded(action.organizationNameEn, 120) : null,
            primaryLanguage: action.primaryLanguage === "en" ? "en" : "ar",
          },
        });
        if ((profile.displayLabel || "") !== (displayLabel || "")) auditOperation = "profile.label.changed";
        break;
      }
      case "ABOUT_SAVE":
        await tx.profile.update({
          where: { id: profileId },
          data: {
            title: bounded(action.title, 120),
            bio: bounded(action.bio, 2000),
            bioAr: bounded(action.bioAr, 2000),
            bioEn: bounded(action.bioEn, 2000),
            descriptionAr: bounded(action.descriptionAr, 3000),
            descriptionEn: bounded(action.descriptionEn, 3000),
          },
        });
        break;
      case "CONTACT_SAVE": {
        const email = bounded(action.email, 254);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("EMAIL_INVALID");
        const website = action.website ? safeHttpUrl(action.website) : null;
        const visibility = action.visibility && typeof action.visibility === "object"
          ? action.visibility as Record<string, unknown>
          : {};
        await tx.profile.update({
          where: { id: profileId },
          data: {
            phone: bounded(action.phone, 32),
            alternatePhone: bounded(action.alternatePhone, 32),
            email,
            website,
            whatsappBusiness: bounded(action.whatsappBusiness, 32),
            whatsappPrivate: bounded(action.whatsappPrivate, 32),
            locationText: bounded(action.locationText, 300),
            addressAr: bounded(action.addressAr, 500),
            addressEn: bounded(action.addressEn, 500),
            showPhone: booleanVisibility(visibility.phone ?? false),
            showEmail: booleanVisibility(visibility.email ?? false),
            showWebsite: booleanVisibility(visibility.website ?? false),
            showWhatsappBusiness: booleanVisibility(visibility.whatsappBusiness ?? false),
            showWhatsappPrivate: booleanVisibility(visibility.whatsappPrivate ?? false),
            showLocation: booleanVisibility(visibility.location ?? false),
          },
        });
        auditOperation = "profile.field.visibility_changed";
        auditMetadata = { moduleKey: "CONTACT" };
        break;
      }
      case "LINK_UPSERT": {
        const destinationType = String(action.destinationType || "CUSTOM_URL") as DestinationType;
        if (!editableDestinationTypes.has(destinationType)) throw new Error("DESTINATION_TYPE_INVALID");
        const normalized = normalizeAndValidate(destinationType, bounded(action.url, 2048, true)!);
        if (!normalized.valid) throw new Error("URL_INVALID");
        const titleAr = bounded(action.titleAr, 120);
        const titleEn = bounded(action.titleEn, 120);
        const title = bounded(action.title, 120) || titleAr || titleEn;
        if (!title) throw new Error("FIELD_REQUIRED");
        const isVisible = booleanVisibility(action.visibility);
        if (action.id) {
          const id = requiredId(action.id);
          const updated = await tx.destination.updateMany({ where: { id, profileId, type: { notIn: ["PROFILE", "VCF", "FILE"] } }, data: { title, titleAr, titleEn, type: destinationType, url: normalized.url, isVisible } });
          if (!updated.count) throw new Error("ITEM_NOT_FOUND");
          auditTarget = id;
          auditOperation = "profile.link.updated";
        } else {
          await assertWithinLimitLocked(tx, profile.userId, "links");
          const sortOrder = await tx.destination.count({ where: { profileId } });
          const created = await tx.destination.create({ data: { userId: profile.userId, organizationId: profile.organizationId, profileId, title, titleAr, titleEn, type: destinationType, url: normalized.url, isVisible, sortOrder: sortOrder * 10 } });
          auditTarget = created.id;
          auditOperation = "profile.link.created";
        }
        auditMetadata = { moduleKey: destinationType === "SOCIAL" || ["FACEBOOK", "LINKEDIN", "GITHUB", "TIKTOK", "INSTAGRAM", "X", "YOUTUBE", "TELEGRAM"].includes(destinationType) ? "SOCIAL" : "LINKS", visibility: isVisible ? "PUBLIC" : "ONLY_ME" };
        break;
      }
      case "LINK_DELETE": {
        const id = requiredId(action.id);
        const deleted = await tx.destination.deleteMany({ where: { id, profileId, type: { notIn: ["PROFILE", "VCF", "FILE"] } } });
        if (!deleted.count) throw new Error("ITEM_NOT_FOUND");
        auditTarget = id; auditOperation = "profile.link.removed";
        break;
      }
      case "LINK_REORDER":
        await reorderExact(tx, "destination", profileId, uniqueStringList(action.ids));
        auditOperation = "profile.link.reordered";
        break;
      case "SERVICE_UPSERT": {
        const nameAr = bounded(action.nameAr, 160);
        const nameEn = bounded(action.nameEn, 160);
        if (!nameAr && !nameEn) throw new Error("FIELD_REQUIRED");
        const data = { nameAr, nameEn, descriptionAr: bounded(action.descriptionAr, 1000), descriptionEn: bounded(action.descriptionEn, 1000), url: action.url ? safeHttpUrl(action.url) : null, isVisible: booleanVisibility(action.visibility) };
        if (action.id) {
          const id = requiredId(action.id);
          const updated = await tx.profileService.updateMany({ where: { id, profileId }, data });
          if (!updated.count) throw new Error("ITEM_NOT_FOUND");
          auditTarget = id; auditOperation = "profile.service.updated";
        } else {
          const sortOrder = await tx.profileService.count({ where: { profileId } });
          const created = await tx.profileService.create({ data: { profileId, ...data, sortOrder: sortOrder * 10 } });
          auditTarget = created.id; auditOperation = "profile.service.created";
        }
        auditMetadata = { visibility: data.isVisible ? "PUBLIC" : "ONLY_ME" };
        break;
      }
      case "SERVICE_DELETE": {
        const id = requiredId(action.id);
        const deleted = await tx.profileService.deleteMany({ where: { id, profileId } });
        if (!deleted.count) throw new Error("ITEM_NOT_FOUND");
        auditTarget = id; auditOperation = "profile.service.removed";
        break;
      }
      case "SERVICE_REORDER":
        await reorderExact(tx, "profileService", profileId, uniqueStringList(action.ids));
        auditOperation = "profile.service.reordered";
        break;
      case "BRANCH_UPSERT": {
        const nameAr = bounded(action.nameAr, 160);
        const nameEn = bounded(action.nameEn, 160);
        if (!nameAr && !nameEn) throw new Error("FIELD_REQUIRED");
        const data = { nameAr, nameEn, addressAr: bounded(action.addressAr, 500), addressEn: bounded(action.addressEn, 500), phone: bounded(action.phone, 32), mapUrl: action.mapUrl ? safeHttpUrl(action.mapUrl) : null, isVisible: booleanVisibility(action.visibility) };
        if (action.id) {
          const id = requiredId(action.id);
          const updated = await tx.profileBranch.updateMany({ where: { id, profileId }, data });
          if (!updated.count) throw new Error("ITEM_NOT_FOUND");
          auditTarget = id; auditOperation = "profile.branch.updated";
        } else {
          const sortOrder = await tx.profileBranch.count({ where: { profileId } });
          const created = await tx.profileBranch.create({ data: { profileId, ...data, sortOrder: sortOrder * 10 } });
          auditTarget = created.id; auditOperation = "profile.branch.created";
        }
        auditMetadata = { visibility: data.isVisible ? "PUBLIC" : "ONLY_ME" };
        break;
      }
      case "BRANCH_DELETE": {
        const id = requiredId(action.id);
        const deleted = await tx.profileBranch.deleteMany({ where: { id, profileId } });
        if (!deleted.count) throw new Error("ITEM_NOT_FOUND");
        auditTarget = id; auditOperation = "profile.branch.removed";
        break;
      }
      case "BRANCH_REORDER":
        await reorderExact(tx, "profileBranch", profileId, uniqueStringList(action.ids));
        auditOperation = "profile.branch.reordered";
        break;
      case "MODULE_ADD": {
        const key = String(action.key || "").toUpperCase();
        const definition = await tx.profileModuleDefinition.findUnique({ where: { key } });
        const rule = definition && profile.templateId
          ? profile.template?.moduleRules.find((item) => item.moduleDefinitionId === definition.id)
          : null;
        const decision = moduleUpdateDecision({ key, supported: editorKeys.has(key), allowed: Boolean(definition?.isActive) && (!profile.templateId || Boolean(rule?.allowed)), required: Boolean(rule?.required), enabled: true });
        if (!decision.allowed || !definition) throw new Error(decision.allowed ? "MODULE_NOT_FOUND" : decision.error);
        if (profile.modules.some((module) => module.moduleDefinitionId === definition.id)) throw new Error("MODULE_DUPLICATE");
        const maximum = profile.modules.reduce((value, module) => Math.max(value, module.sortOrder), -10);
        const created = await tx.profileModule.create({ data: { profileId, moduleDefinitionId: definition.id, enabled: true, visibility: "ONLY_ME", sortOrder: maximum + 10, configurationVersion: definition.schemaVersion } });
        auditTarget = created.id; auditOperation = "profile.module.added"; auditMetadata = { moduleKey: key };
        break;
      }
      case "MODULE_UPDATE": {
        const key = String(action.key || "").toUpperCase();
        const instance = profile.modules.find((module) => module.moduleDefinition.key === key);
        if (!instance) throw new Error("MODULE_NOT_FOUND");
        const enabled = typeof action.enabled === "boolean" ? action.enabled : instance.enabled;
        const visibility = action.visibility === undefined ? instance.visibility : audience(action.visibility);
        const rule = profile.template?.moduleRules.find((item) => item.moduleDefinitionId === instance.moduleDefinitionId);
        const decision = moduleUpdateDecision({ key, supported: editorKeys.has(key), allowed: !profile.templateId || Boolean(rule?.allowed), required: requiredKeys.has(key), enabled });
        if (!decision.allowed) throw new Error(decision.error);
        await tx.profileModule.update({ where: { id: instance.id }, data: { enabled, visibility } });
        auditTarget = instance.id; auditOperation = enabled ? "profile.module.updated" : "profile.module.disabled"; auditMetadata = { moduleKey: key, visibility };
        break;
      }
      case "MODULE_REORDER": {
        const keys = uniqueStringList(action.keys).map((key) => key.toUpperCase());
        if (keys.length !== profile.modules.length || profile.modules.some((module) => !keys.includes(module.moduleDefinition.key))) throw new Error("ORDER_INVALID");
        for (const [index, key] of keys.entries()) {
          const instance = profile.modules.find((module) => module.moduleDefinition.key === key)!;
          await tx.profileModule.update({ where: { id: instance.id }, data: { sortOrder: index * 10 } });
        }
        auditOperation = "profile.module.reordered";
        break;
      }
      case "MEDIA_VISIBILITY": {
        const id = requiredId(action.id);
        const visibility = audience(action.visibility);
        const updated = await tx.profileMediaAsset.updateMany({ where: { id, profileId, state: { in: ["DRAFT_ATTACHED", "PUBLISHED"] } }, data: { visibility } });
        if (!updated.count) throw new Error("ITEM_NOT_FOUND");
        auditTarget = id; auditOperation = "profile.media.visibility_changed"; auditMetadata = { visibility };
        break;
      }
      case "MEDIA_REORDER":
        await reorderExact(tx, "profileMediaAsset", profileId, uniqueStringList(action.ids));
        auditOperation = "profile.media.reordered";
        break;
      default:
        throw new Error("ACTION_INVALID");
    }

    const changed = await tx.profile.updateMany({ where: { id: profileId, draftRevision: expectedRevision }, data: { draftRevision: { increment: 1 } } });
    if (changed.count !== 1) throw new Error("STALE_DRAFT");
    if (auditOperation) await tx.auditLog.create({ data: { actorId: userId, operation: auditOperation, targetId: auditTarget, metadata: auditMetadata } });
    return { ok: true, draftRevision: expectedRevision + 1 };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 });
}
