import {
  OrgRole,
  Prisma,
  prisma,
  type ProfileAccess,
  type ProfileLifecycle,
  type ProfileModuleVisibility,
} from "@popwam/db";
import { createHash, randomUUID } from "node:crypto";
import { isDraftStorageEnabled } from "@popwam/storage";
import { validateProfileSlug } from "./profile-slugs";
import { canReadModuleForAudience } from "./friends-policy";
import {
  getAccountTypePolicies,
  type AccountTypePolicy,
} from "./account-type-policy";

export type ReadinessIssue = {
  code: string;
  path: string;
  module?: string;
  messageKey: string;
  severity: "ERROR";
  blocking: boolean;
};

export type ProfileReadiness = {
  ready: boolean;
  draftRevision: number;
  lifecycle: ProfileLifecycle;
  access: ProfileAccess;
  issues: ReadinessIssue[];
};

export const draftProfileInclude = {
  fields: { orderBy: { sortOrder: "asc" } },
  uploads: { orderBy: { sortOrder: "asc" } },
  destinations: { orderBy: { sortOrder: "asc" } },
  services: { orderBy: { sortOrder: "asc" } },
  branches: { orderBy: { sortOrder: "asc" } },
  mediaAssets: {
    where: { state: { in: ["DRAFT_ATTACHED", "PUBLISHED"] } },
    orderBy: { sortOrder: "asc" },
  },
  sectionEntries: {
    include: { moduleDefinition: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
  verificationCases: { orderBy: { kind: "asc" } },
  modules: {
    include: { moduleDefinition: true },
    orderBy: { sortOrder: "asc" },
  },
  template: {
    include: { moduleRules: { include: { moduleDefinition: true } } },
  },
  category: true,
  virtualCard: { include: { template: true } },
  publication: {
    select: {
      publishedRevision: {
        select: {
          revisionNumber: true,
          sourceDraftRevision: true,
          draftFingerprint: true,
        },
      },
    },
  },
} satisfies Prisma.ProfileInclude;

export type DraftProfileData = Prisma.ProfileGetPayload<{
  include: typeof draftProfileInclude;
}>;

export function managedProfileWhere(
  userId: string,
  profileId: string,
): Prisma.ProfileWhereInput {
  return {
    id: profileId,
    OR: [
      { userId },
      {
        organization: {
          memberships: {
            some: { userId, role: { in: [OrgRole.OWNER, OrgRole.ORG_ADMIN] } },
          },
        },
      },
    ],
  };
}

export function profileDraftFingerprint(profile: DraftProfileData) {
  const scalar = {
    slug: profile.draftSlug ?? profile.slug,
    displayName: profile.displayName,
    displayLabel: profile.displayLabel,
    type: profile.type,
    profileKind: profile.profileKind,
    categoryId: profile.categoryId,
    templateId: profile.templateId,
    access: profile.access,
    primaryLanguage: profile.primaryLanguage, theme: profile.theme,
    profession: profile.profession,
    customProfession: profile.customProfession,
    firstName: profile.firstName,
    lastName: profile.lastName,
    displayNameAr: profile.displayNameAr,
    displayNameEn: profile.displayNameEn,
    title: profile.title,
    jobTitleAr: profile.jobTitleAr,
    jobTitleEn: profile.jobTitleEn,
    company: profile.company,
    bio: profile.bio,
    bioAr: profile.bioAr,
    bioEn: profile.bioEn,
    organizationNameAr: profile.organizationNameAr,
    organizationNameEn: profile.organizationNameEn,
    industryAr: profile.industryAr,
    industryEn: profile.industryEn,
    descriptionAr: profile.descriptionAr,
    descriptionEn: profile.descriptionEn,
    avatarUrl: profile.avatarUrl,
    coverUrl: profile.coverUrl,
    logoUrl: profile.logoUrl,
    phone: profile.phone,
    alternatePhone: profile.alternatePhone,
    whatsappBusiness: profile.whatsappBusiness,
    whatsappPrivate: profile.whatsappPrivate,
    email: profile.email,
    website: profile.website,
    facebook: profile.facebook,
    linkedin: profile.linkedin,
    github: profile.github,
    tiktok: profile.tiktok,
    locationText: profile.locationText,
    addressAr: profile.addressAr,
    addressEn: profile.addressEn,
    visibility: [
      profile.showAvatar,
      profile.showCover,
      profile.showDisplayName,
      profile.showTitle,
      profile.showBio,
      profile.showPhone,
      profile.showEmail,
      profile.showWebsite,
      profile.showLocation,
      profile.showWhatsappBusiness,
      profile.showWhatsappPrivate,
      profile.showSocialLinks,
      profile.showCustomFields,
      profile.showUploadedFiles,
      profile.showSaveContact,
    ],
    modules: profile.modules.map((item) => [
      item.moduleDefinition.key,
      item.enabled,
      item.visibility,
      item.sortOrder,
      item.configuration,
    ]),
    fields: profile.fields.map((item) => [
      item.id,
      item.label,
      item.labelAr,
      item.labelEn,
      item.value,
      item.type,
      item.isVisible,
      item.sortOrder,
    ]),
    destinations: profile.destinations.map((item) => [
      item.id,
      item.title,
      item.titleAr,
      item.titleEn,
      item.type,
      item.url,
      item.isActive,
      item.isVisible,
      item.sortOrder,
    ]),
    files: profile.uploads.map((item) => [
      item.id,
      item.publicUrl,
      item.isVisible,
      item.sortOrder,
    ]),
    services: profile.services.map((item) => [
      item.id,
      item.nameAr,
      item.nameEn,
      item.descriptionAr,
      item.descriptionEn,
      item.itemType,
      item.imageUrl,
      item.price?.toString() ?? null,
      item.currency,
      item.category,
      item.featured,
      item.isVisible,
      item.sortOrder,
    ]),
    branches: profile.branches.map((item) => [
      item.id,
      item.nameAr,
      item.nameEn,
      item.addressAr,
      item.addressEn,
      item.isVisible,
      item.sortOrder,
    ]),
    media: profile.mediaAssets.map((item) => [
      item.id,
      item.purpose,
      item.visibility,
      item.sortOrder,
    ]),
    sectionEntries: profile.sectionEntries.map((item) => [
      item.id,
      item.moduleDefinition.key,
      item.fieldKey,
      item.instanceKey,
      item.value,
      item.visibility,
      item.sortOrder,
      item.schemaVersion,
    ]),
  };
  return createHash("sha256").update(JSON.stringify(scalar)).digest("hex");
}

export function evaluateProfileReadiness(
  profile: DraftProfileData,
  accountTypePolicy?: AccountTypePolicy,
): ProfileReadiness {
  const issues: ReadinessIssue[] = [];
  const issue = (
    code: string,
    path: string,
    messageKey = `publishing.issue.${code.toLowerCase()}`,
  ) =>
    issues.push({ code, path, messageKey, severity: "ERROR", blocking: true });
  if (profile.lifecycle === "ARCHIVED") issue("PROFILE_ARCHIVED", "lifecycle");
  if (!profile.displayName.trim())
    issue("DISPLAY_NAME_REQUIRED", "displayName");
  if (!profile.profileKind) issue("PROFILE_KIND_REQUIRED", "profileKind");
  if (!profile.categoryId) issue("CATEGORY_REQUIRED", "categoryId");
  if (!profile.templateId) issue("TEMPLATE_REQUIRED", "templateId");
  if (
    profile.category &&
    profile.profileKind &&
    profile.category.profileKind !== profile.profileKind
  )
    issue("CATEGORY_MISMATCH", "categoryId");
  if (
    profile.template &&
    profile.profileKind &&
    profile.template.profileKind &&
    profile.template.profileKind !== profile.profileKind
  )
    issue("TEMPLATE_MISMATCH", "templateId");
  if (
    profile.template?.categoryId &&
    profile.categoryId &&
    profile.template.categoryId !== profile.categoryId
  )
    issue("TEMPLATE_MISMATCH", "templateId");
  if (profile.access === "PRIVATE") issue("VISIBILITY_REQUIRED", "access");
  const effectiveSlug = profile.draftSlug ?? profile.slug;
  if (!effectiveSlug) issue("SLUG_REQUIRED", "slug");
  else {
    const result = validateProfileSlug(effectiveSlug);
    if (!result.ok || result.slug !== effectiveSlug)
      issue(result.ok ? "SLUG_NOT_NORMALIZED" : result.error, "slug");
  }
  for (const media of profile.mediaAssets) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(media.mimeType) ||
      media.sizeBytes <= 0n ||
      media.sizeBytes > 5n * 1024n * 1024n
    ) {
      issue("MEDIA_INVALID", `media.${media.id}`);
    } else if (media.state === "DRAFT_ATTACHED" && !isDraftStorageEnabled()) {
      issue("MEDIA_NOT_READY", `media.${media.id}`);
    }
  }
  const enabled = new Set(
    profile.modules
      .filter((module) => module.enabled)
      .map((module) => module.moduleDefinitionId),
  );
  const identityModule = profile.modules.find(
    (item) => item.moduleDefinition.key === "IDENTITY",
  );
  if (!identityModule) {
    issues.push({
      code: "REQUIRED_MODULE_MISSING",
      path: "modules.IDENTITY",
      module: "IDENTITY",
      messageKey: "publishing.issue.required_module_missing",
      severity: "ERROR",
      blocking: true,
    });
  } else if (!identityModule.enabled) {
    issues.push({
      code: "REQUIRED_MODULE_DISABLED",
      path: "modules.IDENTITY",
      module: "IDENTITY",
      messageKey: "publishing.issue.required_module_disabled",
      severity: "ERROR",
      blocking: true,
    });
  } else if (identityModule.visibility !== "PUBLIC") {
    issues.push({
      code: "REQUIRED_MODULE_NOT_PUBLIC",
      path: "modules.IDENTITY.visibility",
      module: "IDENTITY",
      messageKey: "publishing.issue.required_module_not_public",
      severity: "ERROR",
      blocking: true,
    });
  }
  for (const rule of profile.template?.moduleRules ?? []) {
    if (rule.moduleDefinition.key === "IDENTITY") continue;
    if (!rule.required) continue;
    const instance = profile.modules.find(
      (item) => item.moduleDefinitionId === rule.moduleDefinitionId,
    );
    if (!instance) {
      issues.push({
        code: "REQUIRED_MODULE_MISSING",
        path: `modules.${rule.moduleDefinition.key}`,
        module: rule.moduleDefinition.key,
        messageKey: "publishing.issue.required_module_missing",
        severity: "ERROR",
        blocking: true,
      });
      continue;
    }
    if (!enabled.has(rule.moduleDefinitionId)) {
      issues.push({
        code: "REQUIRED_MODULE_DISABLED",
        path: `modules.${rule.moduleDefinition.key}`,
        module: rule.moduleDefinition.key,
        messageKey: "publishing.issue.required_module_disabled",
        severity: "ERROR",
        blocking: true,
      });
      continue;
    }
    if (instance?.visibility !== "PUBLIC") {
      issues.push({
        code: "REQUIRED_MODULE_NOT_PUBLIC",
        path: `modules.${rule.moduleDefinition.key}.visibility`,
        module: rule.moduleDefinition.key,
        messageKey: "publishing.issue.required_module_not_public",
        severity: "ERROR",
        blocking: true,
      });
      continue;
    }
    const complete =
      rule.moduleDefinition.key === "IDENTITY"
        ? Boolean(profile.displayName.trim())
        : rule.moduleDefinition.key === "CONTACT"
          ? Boolean(
              profile.phone ||
                profile.email ||
                profile.website ||
                profile.whatsappBusiness ||
                profile.whatsappPrivate,
            )
          : rule.moduleDefinition.key === "LINKS"
            ? profile.destinations.some(
                (item) => item.isActive && item.isVisible,
              )
            : rule.moduleDefinition.key === "SERVICES"
              ? profile.services.some((item) => item.isVisible)
              : rule.moduleDefinition.key === "BRANCHES"
                ? profile.branches.some((item) => item.isVisible)
                : rule.moduleDefinition.key === "GALLERY"
                  ? profile.uploads.some((item) => item.isVisible) ||
                    profile.mediaAssets.some(
                      (item) =>
                        item.state === "DRAFT_ATTACHED" ||
                        item.state === "PUBLISHED",
                    )
                  : true;
    if (!complete) {
      issues.push({
        code: "MODULE_INCOMPLETE",
        path: `modules.${rule.moduleDefinition.key}`,
        module: rule.moduleDefinition.key,
        messageKey: "publishing.issue.module_incomplete",
        severity: "ERROR",
        blocking: true,
      });
    }
  }
  if (accountTypePolicy?.enabled) {
    for (const [moduleKey, state] of Object.entries(
      accountTypePolicy.modules,
    )) {
      if (state !== "REQUIRED" || moduleKey === "IDENTITY") continue;
      const instance = profile.modules.find(
        (item) => item.moduleDefinition.key === moduleKey,
      );
      if (!instance)
        issue("ACCOUNT_TYPE_MODULE_REQUIRED", `modules.${moduleKey}`);
      else if (!instance.enabled)
        issue("ACCOUNT_TYPE_MODULE_DISABLED", `modules.${moduleKey}`);
    }
    if (
      accountTypePolicy.requireAvatar &&
      !(profile.profileKind === "BUSINESS"
        ? profile.logoUrl || profile.avatarUrl
        : profile.avatarUrl)
    )
      issue("ACCOUNT_TYPE_AVATAR_REQUIRED", "avatarUrl");
    if (accountTypePolicy.requireCover && !profile.coverUrl)
      issue("ACCOUNT_TYPE_COVER_REQUIRED", "coverUrl");
    if (
      accountTypePolicy.requireVerification &&
      !profile.verificationCases.some((item) => item.status === "VERIFIED")
    )
      issue("ACCOUNT_TYPE_VERIFICATION_REQUIRED", "verification");
  }
  return {
    ready: !issues.some((item) => item.blocking),
    draftRevision: profile.draftRevision,
    lifecycle: profile.lifecycle,
    access: profile.access,
    issues,
  };
}

export async function getOwnedDraft(userId: string, profileId: string) {
  return prisma.profile.findFirst({
    where: managedProfileWhere(userId, profileId),
    include: draftProfileInclude,
  });
}

const revisionInclude = {
  modules: { orderBy: { sortOrder: "asc" } },
  fields: { orderBy: { sortOrder: "asc" } },
  destinations: { orderBy: { sortOrder: "asc" } },
  files: { orderBy: { sortOrder: "asc" } },
  services: { orderBy: { sortOrder: "asc" } },
  branches: { orderBy: { sortOrder: "asc" } },
  media: { orderBy: { sortOrder: "asc" } },
  sectionEntries: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProfileRevisionInclude;

export type PublishedRevisionData = Prisma.ProfileRevisionGetPayload<{
  include: typeof revisionInclude;
}>;

const socialDestinationTypes = new Set([
  "FACEBOOK",
  "LINKEDIN",
  "GITHUB",
  "TIKTOK",
  "INSTAGRAM",
  "X",
  "YOUTUBE",
  "TELEGRAM",
  "SOCIAL",
]);

export function destinationModuleKey(type: string) {
  return socialDestinationTypes.has(type) ? "SOCIAL" : "LINKS";
}

export function revisionToProfileForAudience(
  profile: DraftProfileData,
  revision: PublishedRevisionData,
  audience: "PUBLIC" | "FRIEND",
  effectiveState?: { access: ProfileAccess; lifecycle: ProfileLifecycle },
) {
  const template = revision.templateSlug
    ? {
        slug: revision.templateSlug,
        configuration: revision.templateConfiguration,
      }
    : null;
  const readableModules = revision.modules.filter(
    (item) =>
      item.enabled && canReadModuleForAudience(item.visibility, audience),
  );
  const modules = new Set(readableModules.map((item) => item.key));
  const identity = modules.has("IDENTITY");
  const about = modules.has("ABOUT");
  const contact = modules.has("CONTACT");
  const social = modules.has("SOCIAL");
  const access = effectiveState?.access ?? profile.access;
  const lifecycle = effectiveState?.lifecycle ?? profile.lifecycle;
  const readable = lifecycle === "PUBLISHED" && access !== "PRIVATE";
  const canReadEntry = (visibility: ProfileModuleVisibility) =>
    canReadModuleForAudience(visibility, audience);
  return {
    id: profile.id,
    slug: revision.slug,
    displayName:
      identity && revision.showDisplayName ? revision.displayName : "",
    displayLabel: null,
    type: revision.type,
    profileKind: revision.profileKind,
    categorySlug: revision.categorySlug,
    lifecycle,
    access,
    canonicalPublication: true,
    isPublic: readable,
    publishedAt: revision.publishedAt,
    primaryLanguage: revision.primaryLanguage,
    profession:
      identity && revision.showTitle ? revision.profession : "PERSONAL",
    customProfession:
      identity && revision.showTitle ? revision.customProfession : null,
    firstName: identity && revision.showDisplayName ? revision.firstName : null,
    lastName: identity && revision.showDisplayName ? revision.lastName : null,
    displayNameAr:
      identity && revision.showDisplayName ? revision.displayNameAr : null,
    displayNameEn:
      identity && revision.showDisplayName ? revision.displayNameEn : null,
    organizationNameAr:
      identity && revision.showDisplayName ? revision.organizationNameAr : null,
    organizationNameEn:
      identity && revision.showDisplayName ? revision.organizationNameEn : null,
    title: identity && revision.showTitle ? revision.title : null,
    jobTitleAr: identity && revision.showTitle ? revision.jobTitleAr : null,
    jobTitleEn: identity && revision.showTitle ? revision.jobTitleEn : null,
    company: identity && revision.showTitle ? revision.company : null,
    industryAr: identity && revision.showTitle ? revision.industryAr : null,
    industryEn: identity && revision.showTitle ? revision.industryEn : null,
    bio: about && revision.showBio ? revision.bio : null,
    bioAr: about && revision.showBio ? revision.bioAr : null,
    bioEn: about && revision.showBio ? revision.bioEn : null,
    descriptionAr: about && revision.showBio ? revision.descriptionAr : null,
    descriptionEn: about && revision.showBio ? revision.descriptionEn : null,
    avatarUrl: identity && revision.showAvatar ? revision.avatarUrl : null,
    logoUrl: identity && revision.showAvatar ? revision.logoUrl : null,
    coverUrl: identity && revision.showCover ? revision.coverUrl : null,
    phone: contact && revision.showPhone ? revision.phone : null,
    alternatePhone:
      contact && revision.showPhone ? revision.alternatePhone : null,
    email: contact && revision.showEmail ? revision.email : null,
    website: contact && revision.showWebsite ? revision.website : null,
    locationText:
      contact && revision.showLocation ? revision.locationText : null,
    addressAr: contact && revision.showLocation ? revision.addressAr : null,
    addressEn: contact && revision.showLocation ? revision.addressEn : null,
    contactNotesAr: null,
    contactNotesEn: null,
    whatsappBusiness:
      contact && revision.showWhatsappBusiness
        ? revision.whatsappBusiness
        : null,
    whatsappPrivate:
      contact && revision.showWhatsappPrivate ? revision.whatsappPrivate : null,
    facebook: social && revision.showSocialLinks ? revision.facebook : null,
    linkedin: social && revision.showSocialLinks ? revision.linkedin : null,
    github: social && revision.showSocialLinks ? revision.github : null,
    tiktok: social && revision.showSocialLinks ? revision.tiktok : null,
    theme: revision.theme,
    showAvatar: revision.showAvatar,
    showCover: revision.showCover,
    showDisplayName: revision.showDisplayName,
    showTitle: revision.showTitle,
    showBio: revision.showBio,
    showPhone: revision.showPhone,
    showEmail: revision.showEmail,
    showWebsite: revision.showWebsite,
    showLocation: revision.showLocation,
    showWhatsappBusiness: revision.showWhatsappBusiness,
    showWhatsappPrivate: revision.showWhatsappPrivate,
    showSocialLinks: revision.showSocialLinks,
    showCustomFields: revision.showCustomFields,
    showUploadedFiles: revision.showUploadedFiles,
    showSaveContact: revision.showSaveContact,
    allowInstallable: revision.allowInstallable,
    fields: about
      ? revision.fields.map((field) => ({
          id: field.sourceId,
          label: field.label,
          labelAr: field.labelAr,
          labelEn: field.labelEn,
          value: field.value,
          type: field.type,
          iconKey: field.iconKey,
          customIconUrl: field.customIconUrl,
          actionUrl: field.actionUrl,
          sortOrder: field.sortOrder,
          isVisible: true,
        }))
      : [],
    uploads: modules.has("GALLERY")
      ? revision.files.map((file) => ({
          id: file.sourceId,
          publicUrl: file.publicUrl,
          originalFilename: file.originalFilename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          title: file.title,
          displayTitleAr: file.displayTitleAr,
          displayTitleEn: file.displayTitleEn,
          sortOrder: file.sortOrder,
          isVisible: true,
        }))
      : [],
    destinations: revision.destinations
      .filter((item) => modules.has(destinationModuleKey(item.type)))
      .map((item) => ({
        id: item.sourceId,
        title: item.title,
        titleAr: item.titleAr,
        titleEn: item.titleEn,
        type: item.type,
        url: item.url,
        icon: item.icon,
        iconKey: item.iconKey,
        customIconUrl: item.customIconUrl,
        sortOrder: item.sortOrder,
        isVisible: true,
        isActive: true,
      })),
    services: modules.has("SERVICES")
      ? revision.services.map((item) => ({
          id: item.sourceId,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          descriptionAr: item.descriptionAr,
          descriptionEn: item.descriptionEn,
          itemType: item.itemType,
          imageUrl: item.imageUrl,
          price: item.price,
          currency: item.currency,
          category: item.category,
          featured: item.featured,
          url: item.url,
          iconKey: item.iconKey,
          sortOrder: item.sortOrder,
          isVisible: true,
        }))
      : [],
    branches: modules.has("BRANCHES")
      ? revision.branches.map((item) => ({
          id: item.sourceId,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          addressAr: item.addressAr,
          addressEn: item.addressEn,
          phone: item.phone,
          mapUrl: item.mapUrl,
          sortOrder: item.sortOrder,
          isVisible: true,
        }))
      : [],
    sectionEntries: revision.sectionEntries
      .filter(
        (item) => modules.has(item.moduleKey) && canReadEntry(item.visibility),
      )
      .map((item) => ({
        id: item.sourceId,
        moduleKey: item.moduleKey,
        fieldKey: item.fieldKey,
        instanceKey: item.instanceKey,
        value: item.value,
        visibility: item.visibility,
        sortOrder: item.sortOrder,
      })),
    modules: readableModules.map((module) => ({
      id: module.id,
      key: module.key,
      enabled: module.enabled,
      visibility: module.visibility,
      sortOrder: module.sortOrder,
      configuration: module.configuration,
      moduleDefinition: { key: module.key },
    })),
    media: revision.media
      .filter(
        (item) =>
          canReadEntry(item.visibility) &&
          modules.has(item.purpose === "GALLERY" ? "GALLERY" : "IDENTITY"),
      )
      .map((item) => ({
        id: item.mediaId,
        mediaId: item.mediaId,
        purpose: item.purpose,
        visibility: item.visibility,
        publicUrl: item.publicUrl,
        sortOrder: item.sortOrder,
      })),
    virtualCard: template ? { template } : null,
  };
}

export function revisionToPublicProfile(
  profile: DraftProfileData,
  revision: PublishedRevisionData,
) {
  return revisionToProfileForAudience(profile, revision, "PUBLIC");
}

/** Legacy compatibility is converted into the same explicit public allowlist;
 * live ORM records are never returned as a public projection. */
export function legacyDraftToPublicProfile(profile: DraftProfileData) {
  const publishedAt = profile.publishedAt || profile.updatedAt;
  const legacyModules = profile.modules.length
    ? profile.modules.map((item) => ({
        id: item.id,
        revisionId: `legacy:${profile.id}`,
        key: item.moduleDefinition.key,
        enabled: item.enabled,
        visibility: item.visibility,
        sortOrder: item.sortOrder,
        configuration: item.configuration,
      }))
    : [
        "IDENTITY",
        "ABOUT",
        "CONTACT",
        "SOCIAL",
        "LINKS",
        "GALLERY",
        "SERVICES",
        "BRANCHES",
      ].map((key, index) => ({
        id: `legacy:${key}`,
        revisionId: `legacy:${profile.id}`,
        key,
        enabled: true,
        visibility: "PUBLIC" as const,
        sortOrder: index * 10,
        configuration: null,
      }));
  const revision = {
    id: `legacy:${profile.id}`,
    profileId: profile.id,
    revisionNumber: 0,
    sourceDraftRevision: profile.draftRevision,
    draftFingerprint: "legacy",
    status: "PUBLISHED",
    access: "PUBLIC",
    slug: profile.slug,
    displayName: profile.displayName,
    displayLabel: profile.displayLabel,
    type: profile.type,
    profileKind: profile.profileKind,
    categorySlug: profile.category?.slug || null,
    primaryLanguage: profile.primaryLanguage,
    profession: profile.profession,
    customProfession: profile.customProfession,
    firstName: profile.firstName,
    lastName: profile.lastName,
    displayNameAr: profile.displayNameAr,
    displayNameEn: profile.displayNameEn,
    title: profile.title,
    jobTitleAr: profile.jobTitleAr,
    jobTitleEn: profile.jobTitleEn,
    company: profile.company,
    bio: profile.bio,
    bioAr: profile.bioAr,
    bioEn: profile.bioEn,
    organizationNameAr: profile.organizationNameAr,
    organizationNameEn: profile.organizationNameEn,
    industryAr: profile.industryAr,
    industryEn: profile.industryEn,
    descriptionAr: profile.descriptionAr,
    descriptionEn: profile.descriptionEn,
    avatarUrl: profile.avatarUrl,
    coverUrl: profile.coverUrl,
    logoUrl: profile.logoUrl,
    phone: profile.phone,
    alternatePhone: profile.alternatePhone,
    whatsappBusiness: profile.whatsappBusiness,
    whatsappPrivate: profile.whatsappPrivate,
    email: profile.email,
    website: profile.website,
    facebook: profile.facebook,
    linkedin: profile.linkedin,
    github: profile.github,
    tiktok: profile.tiktok,
    vcfUrl: profile.vcfUrl,
    locationText: profile.locationText,
    addressAr: profile.addressAr,
    addressEn: profile.addressEn,
    contactNotesAr: profile.contactNotesAr,
    contactNotesEn: profile.contactNotesEn,
    theme: profile.theme,
    showAvatar: profile.showAvatar,
    showCover: profile.showCover,
    showDisplayName: profile.showDisplayName,
    showTitle: profile.showTitle,
    showBio: profile.showBio,
    showPhone: profile.showPhone,
    showEmail: profile.showEmail,
    showWebsite: profile.showWebsite,
    showLocation: profile.showLocation,
    showWhatsappBusiness: profile.showWhatsappBusiness,
    showWhatsappPrivate: profile.showWhatsappPrivate,
    showSocialLinks: profile.showSocialLinks,
    showCustomFields: profile.showCustomFields,
    showUploadedFiles: profile.showUploadedFiles,
    showSaveContact: profile.showSaveContact,
    allowInstallable: profile.allowInstallable,
    templateSlug:
      profile.template?.slug || profile.virtualCard?.template?.slug || null,
    templateConfiguration:
      profile.template?.configuration ||
      profile.virtualCard?.template?.configuration ||
      null,
    publishedAt,
    createdAt: profile.createdAt,
    modules: legacyModules,
    fields: profile.fields.filter((item) => item.isVisible).map((item) => ({
        id: item.id,
        revisionId: `legacy:${profile.id}`,
        sourceId: item.id,
        label: item.label,
        labelAr: item.labelAr,
        labelEn: item.labelEn,
        value: item.value,
        type: item.type,
        iconKey: item.iconKey,
        customIconUrl: item.customIconUrl,
        actionUrl: item.actionUrl,
        sortOrder: item.sortOrder,
      })),
    destinations: profile.destinations.filter((item) => item.isActive && item.isVisible).map((item) => ({
        id: item.id,
        revisionId: `legacy:${profile.id}`,
        sourceId: item.id,
        title: item.title,
        titleAr: item.titleAr,
        titleEn: item.titleEn,
        type: item.type,
        url: item.url,
        icon: item.icon,
        iconKey: item.iconKey,
        customIconUrl: item.customIconUrl,
        sortOrder: item.sortOrder,
      })),
    files: profile.uploads
      .filter((item) => item.isVisible)
      .map((item) => ({
        id: item.id,
        revisionId: `legacy:${profile.id}`,
        sourceId: item.id,
        publicUrl: item.publicUrl,
        originalFilename: item.originalFilename,
        originalName: item.originalName,
        mimeType: item.mimeType,
        title: item.title,
        displayTitleAr: item.displayTitleAr,
        displayTitleEn: item.displayTitleEn,
        sortOrder: item.sortOrder,
      })),
    services: profile.services
      .filter((item) => item.isVisible)
      .map((item) => ({
        id: item.id,
        revisionId: `legacy:${profile.id}`,
        sourceId: item.id,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        descriptionAr: item.descriptionAr,
        descriptionEn: item.descriptionEn,
        itemType: item.itemType,
        imageUrl: item.imageUrl,
        price: item.price,
        currency: item.currency,
        category: item.category,
        featured: item.featured,
        url: item.url,
        iconKey: item.iconKey,
        sortOrder: item.sortOrder,
      })),
    branches: profile.branches
      .filter((item) => item.isVisible)
      .map((item) => ({
        id: item.id,
        revisionId: `legacy:${profile.id}`,
        sourceId: item.id,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        addressAr: item.addressAr,
        addressEn: item.addressEn,
        phone: item.phone,
        mapUrl: item.mapUrl,
        sortOrder: item.sortOrder,
      })),
    media: profile.mediaAssets
      .filter((item) => item.visibility === "PUBLIC" && item.publicUrl)
      .map((item) => ({
        id: item.id,
        revisionId: `legacy:${profile.id}`,
        mediaId: item.id,
        purpose: item.purpose,
        visibility: item.visibility,
        publicUrl: item.publicUrl!,
        sortOrder: item.sortOrder,
      })),
    sectionEntries: profile.sectionEntries
      .filter((item) => item.visibility === "PUBLIC")
      .map((item) => ({
        id: item.id,
        revisionId: `legacy:${profile.id}`,
        sourceId: item.id,
        moduleKey: item.moduleDefinition.key,
        fieldKey: item.fieldKey,
        instanceKey: item.instanceKey,
        value: item.value,
        visibility: item.visibility,
        sortOrder: item.sortOrder,
      })),
  } as PublishedRevisionData;
  return revisionToProfileForAudience(profile, revision, "PUBLIC", {
    access: "PUBLIC",
    lifecycle: "PUBLISHED",
  });
}

export async function publishProfile(
  userId: string,
  profileId: string,
  expectedDraftRevision: number,
) {
  const [candidate, accountTypePolicies] = await Promise.all([
    getOwnedDraft(userId, profileId),
    getAccountTypePolicies(),
  ]);
  if (!candidate) throw new Error("PROFILE_NOT_FOUND");
  if (candidate.draftRevision !== expectedDraftRevision)
    throw new Error("STALE_DRAFT");
  const accountTypePolicy = candidate.profileKind
    ? accountTypePolicies[candidate.profileKind]
    : undefined;
  const initialReadiness = evaluateProfileReadiness(
    candidate,
    accountTypePolicy,
  );
  if (!initialReadiness.ready)
    return { ok: false as const, readiness: initialReadiness };
  return prisma.$transaction(
    async (tx) => {
      const profile = await tx.profile.findFirst({
        where: managedProfileWhere(userId, profileId),
        include: draftProfileInclude,
      });
      if (!profile) throw new Error("PROFILE_NOT_FOUND");
      if (profile.draftRevision !== expectedDraftRevision)
        throw new Error("STALE_DRAFT");
      const readiness = evaluateProfileReadiness(profile, accountTypePolicy);
      if (!readiness.ready) return { ok: false as const, readiness };
      const fingerprint = profileDraftFingerprint(profile);
      if (
        profile.publication?.publishedRevision.draftFingerprint === fingerprint
      ) {
        return {
          ok: true as const,
          idempotent: true as const,
          lifecycle: "PUBLISHED" as const,
          draftRevision: profile.draftRevision,
          readiness,
        };
      }
      const slug = validateProfileSlug(profile.draftSlug ?? profile.slug ?? "");
      if (!slug.ok) throw new Error(slug.error);
      const collision = await tx.profile.findFirst({
        where: { slug: slug.slug, id: { not: profile.id } },
        select: { id: true },
      });
      const historyCollision = await tx.profileSlugHistory.findUnique({
        where: { slug: slug.slug },
        select: { profileId: true },
      });
      if (
        collision ||
        (historyCollision && historyCollision.profileId !== profile.id)
      )
        throw new Error("SLUG_TAKEN");
      const last = await tx.profileRevision.aggregate({
        where: { profileId },
        _max: { revisionNumber: true },
      });
      const revisionId = randomUUID();
      const snapshotModules = profile.modules.filter(
        (item) => item.enabled && (item.visibility === "PUBLIC" || item.visibility === "FRIENDS"),
      );
      const snapshotModuleKeys = new Set(
        snapshotModules.map((item) => item.moduleDefinition.key),
      );
      const publicModuleKeys = new Set(
        snapshotModules.filter((item) => item.visibility === "PUBLIC").map((item) => item.moduleDefinition.key),
      );
      const snapshotModuleVisibility = new Map(
        snapshotModules.map((item) => [
          item.moduleDefinitionId,
          item.visibility,
        ]),
      );
      const snapshotSectionEntries = profile.sectionEntries.flatMap((item) => {
        const moduleVisibility = snapshotModuleVisibility.get(
          item.moduleDefinitionId,
        );
        if (
          !moduleVisibility ||
          (item.visibility !== "PUBLIC" && item.visibility !== "FRIENDS")
        )
          return [];
        const visibility =
          moduleVisibility === "FRIENDS" || item.visibility === "FRIENDS"
            ? ("FRIENDS" as const)
            : ("PUBLIC" as const);
        return [{ item, visibility }];
      });
      const showcaseImagePaths = new Set(publicModuleKeys.has("SERVICES")
        ? profile.services.filter(service => service.isVisible).map(service => service.imageUrl)
        : []);
      const publicAssets = profile.mediaAssets.filter(
        (item) =>
          (item.visibility === "PUBLIC" || showcaseImagePaths.has(`/api/profiles/${profileId}/media/${item.id}`)) &&
          (item.state === "DRAFT_ATTACHED" || item.state === "PUBLISHED") &&
          (item.purpose === "GALLERY"
            ? publicModuleKeys.has("GALLERY") || showcaseImagePaths.has(`/api/profiles/${profileId}/media/${item.id}`)
            : publicModuleKeys.has("IDENTITY")),
      );
      const mediaUrl = (mediaId: string) =>
        `/api/public-profile-media/${mediaId}?revision=${revisionId}`;
      const showcaseImageUrls = new Map(publicAssets.map(asset => [`/api/profiles/${profileId}/media/${asset.id}`, mediaUrl(asset.id)]));
      const publicMedia = (purpose: string) => {
        const asset = [...publicAssets]
          .reverse()
          .find((item) => item.purpose === purpose);
        return asset ? mediaUrl(asset.id) : null;
      };
      const onboardingImage = publicMedia("ONBOARDING_IMAGE");
      const revision = await tx.profileRevision.create({
        data: {
          id: revisionId,
          profileId,
          revisionNumber: (last._max.revisionNumber ?? 0) + 1,
          sourceDraftRevision: profile.draftRevision,
          draftFingerprint: fingerprint,
          access: profile.access,
          slug: slug.slug,
          displayName: profile.displayName,
          displayLabel: profile.displayLabel,
          type: profile.type,
          profileKind: profile.profileKind,
          categorySlug: profile.category?.slug || null,
          primaryLanguage: profile.primaryLanguage,
          profession: profile.profession,
          customProfession: profile.customProfession,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayNameAr: profile.displayNameAr,
          displayNameEn: profile.displayNameEn,
          title: profile.title,
          jobTitleAr: profile.jobTitleAr,
          jobTitleEn: profile.jobTitleEn,
          company: profile.company,
          bio: profile.bio,
          bioAr: profile.bioAr,
          bioEn: profile.bioEn,
          organizationNameAr: profile.organizationNameAr,
          organizationNameEn: profile.organizationNameEn,
          industryAr: profile.industryAr,
          industryEn: profile.industryEn,
          descriptionAr: profile.descriptionAr,
          descriptionEn: profile.descriptionEn,
          avatarUrl:
            publicMedia("AVATAR") ||
            (profile.profileKind === "PERSONAL" ? onboardingImage : null) ||
            profile.avatarUrl,
          coverUrl: publicMedia("COVER") || profile.coverUrl,
          logoUrl:
            publicMedia("LOGO") ||
            (profile.profileKind === "BUSINESS" ? onboardingImage : null) ||
            profile.logoUrl,
          phone: profile.phone,
          alternatePhone: profile.alternatePhone,
          whatsappBusiness: profile.whatsappBusiness,
          whatsappPrivate: profile.whatsappPrivate,
          email: profile.email,
          website: profile.website,
          facebook: profile.facebook,
          linkedin: profile.linkedin,
          github: profile.github,
          tiktok: profile.tiktok,
          vcfUrl: profile.vcfUrl,
          locationText: profile.locationText,
          addressAr: profile.addressAr,
          addressEn: profile.addressEn,
          contactNotesAr: profile.contactNotesAr,
          contactNotesEn: profile.contactNotesEn,
          theme: profile.theme,
          showAvatar: profile.showAvatar,
          showCover: profile.showCover,
          showDisplayName: profile.showDisplayName,
          showTitle: profile.showTitle,
          showBio: profile.showBio,
          showPhone: profile.showPhone,
          showEmail: profile.showEmail,
          showWebsite: profile.showWebsite,
          showLocation: profile.showLocation,
          showWhatsappBusiness: profile.showWhatsappBusiness,
          showWhatsappPrivate: profile.showWhatsappPrivate,
          showSocialLinks: profile.showSocialLinks,
          showCustomFields: profile.showCustomFields,
          showUploadedFiles: profile.showUploadedFiles,
          showSaveContact: profile.showSaveContact,
          allowInstallable: profile.allowInstallable,
          templateSlug:
            profile.template?.slug ?? profile.virtualCard?.template?.slug,
          templateConfiguration:
            profile.template?.configuration ??
            profile.virtualCard?.template?.configuration ??
            Prisma.JsonNull,
          modules: {
            create: snapshotModules.map((item) => ({
              key: item.moduleDefinition.key,
              enabled: true,
              visibility: item.visibility,
              sortOrder: item.sortOrder,
              configuration: item.configuration ?? Prisma.JsonNull,
            })),
          },
          fields: {
            create: snapshotModuleKeys.has("ABOUT")
              ? profile.fields
                  .filter((item) => item.isVisible)
                  .map((item) => ({
                    sourceId: item.id,
                    label: item.label,
                    labelAr: item.labelAr,
                    labelEn: item.labelEn,
                    value: item.value,
                    type: item.type,
                    iconKey: item.iconKey,
                    customIconUrl: item.customIconUrl,
                    actionUrl: item.actionUrl,
                    sortOrder: item.sortOrder,
                  }))
              : [],
          },
          destinations: {
            create: profile.destinations
              .filter(
                (item) =>
                  item.isActive &&
                  item.isVisible &&
                  snapshotModuleKeys.has(destinationModuleKey(item.type)),
              )
              .map((item) => ({
                sourceId: item.id,
                title: item.title,
                titleAr: item.titleAr,
                titleEn: item.titleEn,
                type: item.type,
                url: item.url,
                icon: item.icon,
                iconKey: item.iconKey,
                customIconUrl: item.customIconUrl,
                sortOrder: item.sortOrder,
              })),
          },
          files: {
            create: publicModuleKeys.has("GALLERY")
              ? profile.uploads
                  .filter((item) => item.isVisible)
                  .map((item) => ({
                    sourceId: item.id,
                    publicUrl: item.publicUrl,
                    originalFilename: item.originalFilename,
                    originalName: item.originalName,
                    mimeType: item.mimeType,
                    title: item.title,
                    displayTitleAr: item.displayTitleAr,
                    displayTitleEn: item.displayTitleEn,
                    sortOrder: item.sortOrder,
                  }))
              : [],
          },
          services: {
            create: snapshotModuleKeys.has("SERVICES")
              ? profile.services
                  .filter((item) => item.isVisible)
                  .map((item) => ({
                    sourceId: item.id,
                    nameAr: item.nameAr,
                    nameEn: item.nameEn,
                    descriptionAr: item.descriptionAr,
                    descriptionEn: item.descriptionEn,
                    itemType: item.itemType,
                    imageUrl: item.imageUrl?.startsWith("/api/profiles/")
                      ? showcaseImageUrls.get(item.imageUrl) ?? null
                      : item.imageUrl,
                    price: item.price,
                    currency: item.currency,
                    category: item.category,
                    featured: item.featured,
                    url: item.url,
                    iconKey: item.iconKey,
                    sortOrder: item.sortOrder,
                  }))
              : [],
          },
          branches: {
            create: snapshotModuleKeys.has("BRANCHES")
              ? profile.branches
                  .filter((item) => item.isVisible)
                  .map((item) => ({
                    sourceId: item.id,
                    nameAr: item.nameAr,
                    nameEn: item.nameEn,
                    addressAr: item.addressAr,
                    addressEn: item.addressEn,
                    phone: item.phone,
                    mapUrl: item.mapUrl,
                    sortOrder: item.sortOrder,
                  }))
              : [],
          },
          media: {
            create: publicAssets.map((item) => ({
              mediaId: item.id,
              purpose: item.purpose,
              visibility: "PUBLIC",
              publicUrl: mediaUrl(item.id),
              sortOrder: item.sortOrder,
            })),
          },
          sectionEntries: {
            create: snapshotSectionEntries.map(({ item, visibility }) => ({
              sourceId: item.id,
              moduleKey: item.moduleDefinition.key,
              fieldKey: item.fieldKey,
              instanceKey: item.instanceKey,
              value:
                item.value === null
                  ? Prisma.JsonNull
                  : (item.value as Prisma.InputJsonValue),
              visibility,
              sortOrder: item.sortOrder,
            })),
          },
        },
      });
      if (profile.slug && profile.slug !== slug.slug) {
        await tx.profileSlugHistory.upsert({
          where: { slug: profile.slug },
          create: { slug: profile.slug, profileId },
          update: {},
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            operation: "profile.slug.changed",
            targetId: profileId,
          },
        });
      }
      if (publicAssets.length)
        await tx.profileMediaAsset.updateMany({
          where: { id: { in: publicAssets.map((item) => item.id) } },
          data: { state: "PUBLISHED" },
        });
      await tx.profileRevision.updateMany({
        where: { profileId, id: { not: revision.id }, status: "PUBLISHED" },
        data: { status: "SUPERSEDED" },
      });
      await tx.profilePublication.upsert({
        where: { profileId },
        create: { profileId, publishedRevisionId: revision.id },
        update: { publishedRevisionId: revision.id },
      });
      await tx.profileMediaAsset.updateMany({
        where: {
          profileId,
          state: "PUBLISHED",
          id: { notIn: publicAssets.map((item) => item.id) },
        },
        data: { state: "DRAFT_ATTACHED" },
      });
      await tx.profile.update({
        where: { id: profileId },
        data: {
          lifecycle: "PUBLISHED",
          publishedAt: revision.publishedAt,
          isPublic: true,
          slug: slug.slug,
          draftSlug: slug.slug,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          operation: "profile.published",
          targetId: profileId,
          metadata: {
            revisionNumber: revision.revisionNumber,
            profileKind: profile.profileKind,
            categoryKey: profile.category?.slug ?? null,
          },
        },
      });
      for (const media of publicAssets) {
        await tx.auditLog.create({
          data: {
            actorId: userId,
            operation: "profile.media.promoted",
            targetId: media.id,
            metadata: { purpose: media.purpose },
          },
        });
      }
      return {
        ok: true as const,
        idempotent: false as const,
        lifecycle: "PUBLISHED" as const,
        draftRevision: profile.draftRevision,
        readiness,
        revisionNumber: revision.revisionNumber,
      };
    },
    { isolationLevel: "Serializable", maxWait: 10_000, timeout: 30_000 },
  );
}

export async function transitionProfile(
  userId: string,
  profileId: string,
  action: "pause" | "resume" | "archive",
) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.findFirst({
      where: managedProfileWhere(userId, profileId),
      select: {
        lifecycle: true,
        isPrimary: true,
        publication: { select: { id: true } },
      },
    });
    if (!profile) throw new Error("PROFILE_NOT_FOUND");
    if (action === "archive") {
      if (profile.isPrimary)
        throw new Error("PRIMARY_PROFILE_ARCHIVE_FORBIDDEN");
      if (profile.lifecycle !== "DRAFT" && profile.lifecycle !== "PAUSED")
        throw new Error("PROFILE_TRANSITION_INVALID");
      await tx.profile.update({
        where: { id: profileId },
        data: {
          lifecycle: "ARCHIVED",
          archivedAt: new Date(),
          isPublic: false,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          operation: "profile.archived",
          targetId: profileId,
        },
      });
      return "ARCHIVED" as const;
    }
    if (!profile.publication) throw new Error("PUBLISHED_REVISION_REQUIRED");
    if (action === "pause" && profile.lifecycle !== "PUBLISHED")
      throw new Error("PROFILE_TRANSITION_INVALID");
    if (action === "resume" && profile.lifecycle !== "PAUSED")
      throw new Error("PROFILE_TRANSITION_INVALID");
    const lifecycle = action === "pause" ? "PAUSED" : "PUBLISHED";
    await tx.profile.update({
      where: { id: profileId },
      data: { lifecycle, isPublic: action === "resume" },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        operation: action === "pause" ? "profile.paused" : "profile.resumed",
        targetId: profileId,
      },
    });
    return lifecycle;
  });
}

export async function loadPublishedRevision(profileId: string) {
  const publication = await prisma.profilePublication.findUnique({
    where: { profileId },
    select: { publishedRevision: { include: revisionInclude } },
  });
  return publication?.publishedRevision ?? null;
}
