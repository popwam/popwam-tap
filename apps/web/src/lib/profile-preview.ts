import type { DraftProfileData } from "./profile-publishing";
import { moduleUsesCanonicalPublicState } from "./profile-projection";

export type ProfilePreviewProjection = {
  profileId: string;
  draftRevision: number;
  lifecycle: string;
  access: string;
  slug: string | null;
  identity: { name: string; title: string | null; bio: string | null; imageUrl: string | null; coverUrl: string | null };
  modules: Array<{ key: string; visibility: string; enabled: boolean; sortOrder: number }>;
  fieldVisibility: Record<string, boolean>;
  links: Array<{ id: string; title: string; url: string }>;
  services: Array<{ id: string; name: string; description: string | null }>;
  branches: Array<{ id: string; name: string; address: string | null }>;
  media: Array<{ id: string; purpose: string; visibility: string; previewUrl: string }>;
};

export function buildOwnerPreviewProjection(profile: DraftProfileData, locale: "en" | "ar"): ProfilePreviewProjection {
  const ar = locale === "ar";
  const localized = (arValue: string | null, enValue: string | null, fallback?: string | null) =>
    (ar ? arValue || enValue : enValue || arValue) || fallback || "";
  const business = profile.profileKind === "BUSINESS";
  const mediaUrl = (purpose: string) => [...profile.mediaAssets].reverse().find((item) => item.purpose === purpose)?.id;
  const proxied = (id?: string) => id ? `/api/profiles/${profile.id}/media/${id}` : null;
  const onboardingImage = proxied(mediaUrl("ONBOARDING_IMAGE"));
  return {
    profileId: profile.id,
    draftRevision: profile.draftRevision,
    lifecycle: profile.lifecycle,
    access: profile.access,
    slug: profile.draftSlug ?? profile.slug,
    identity: {
      name: business
        ? localized(profile.organizationNameAr, profile.organizationNameEn, profile.displayName)
        : localized(profile.displayNameAr, profile.displayNameEn, profile.displayName),
      title: business
        ? localized(profile.industryAr, profile.industryEn, profile.title) || null
        : localized(profile.jobTitleAr, profile.jobTitleEn, profile.title) || null,
      bio: business
        ? localized(profile.descriptionAr, profile.descriptionEn, profile.bio) || null
        : localized(profile.bioAr, profile.bioEn, profile.bio) || null,
      imageUrl: business ? proxied(mediaUrl("LOGO")) || onboardingImage || profile.logoUrl || profile.avatarUrl : proxied(mediaUrl("AVATAR")) || onboardingImage || profile.avatarUrl,
      coverUrl: proxied(mediaUrl("COVER")) || profile.coverUrl,
    },
    modules: profile.modules.map((item) => ({
      key: item.moduleDefinition.key,
      visibility: item.visibility,
      enabled: item.enabled,
      sortOrder: item.sortOrder,
    })),
    fieldVisibility: {
      phone: profile.showPhone, email: profile.showEmail, website: profile.showWebsite,
      location: profile.showLocation, social: profile.showSocialLinks,
      whatsappBusiness: profile.showWhatsappBusiness, whatsappPrivate: profile.showWhatsappPrivate,
    },
    links: moduleUsesCanonicalPublicState(profile as never, "LINKS", true)
      ? profile.destinations.filter((item) => item.isActive && item.isVisible).map((item) => ({ id: item.id, title: localized(item.titleAr, item.titleEn, item.title), url: item.url }))
      : [],
    services: profile.services.filter((item) => item.isVisible).map((item) => ({ id: item.id, name: localized(item.nameAr, item.nameEn), description: localized(item.descriptionAr, item.descriptionEn) || null })),
    branches: profile.branches.filter((item) => item.isVisible).map((item) => ({ id: item.id, name: localized(item.nameAr, item.nameEn), address: localized(item.addressAr, item.addressEn) || null })),
    media: profile.mediaAssets.filter((item) => item.state !== "DELETED" && item.state !== "ORPHANED").map((item) => ({ id: item.id, purpose: item.purpose, visibility: item.visibility, previewUrl: `/api/profiles/${profile.id}/media/${item.id}` })),
  };
}
