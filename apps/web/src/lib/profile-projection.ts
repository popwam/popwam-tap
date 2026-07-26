import { Prisma, prisma } from "@popwam/db";
import { isPublicModuleReadable, isPublicProfileReadable } from "./profile-authorization";
import { draftProfileInclude, loadPublishedRevision, revisionToProfileForAudience, revisionToPublicProfile, type DraftProfileData } from "./profile-publishing";
import { normalizeProfileSlug } from "./profile-slugs";
import { relationshipStateForUsers } from "./friends-domain";

export const publicProfileInclude = {
  fields: { orderBy: { sortOrder: "asc" } },
  uploads: { orderBy: { sortOrder: "asc" } },
  destinations: { orderBy: { sortOrder: "asc" } },
  services: { orderBy: { sortOrder: "asc" } },
  branches: { orderBy: { sortOrder: "asc" } },
  modules: { include: { moduleDefinition: true }, orderBy: { sortOrder: "asc" } },
  virtualCard: { include: { template: true } },
} satisfies Prisma.ProfileInclude;

export type PublicProfileProjectionData = Prisma.ProfileGetPayload<{ include: typeof publicProfileInclude }>;

export function moduleUsesCanonicalPublicState(profile: PublicProfileProjectionData, moduleKey: string, legacyFallback: boolean, audience: "PUBLIC" | "FRIEND" = "PUBLIC") {
  const matching = profile.modules.filter((module) => module.moduleDefinition.key === moduleKey);
  return matching.length
    ? matching.some((module) => module.enabled && (module.visibility === "PUBLIC" || (audience === "FRIEND" && module.visibility === "FRIENDS")))
    : ((profile as PublicProfileProjectionData & { canonicalPublication?: boolean }).canonicalPublication ? false : legacyFallback);
}

export function buildPublicProfileProjection(profile: PublicProfileProjectionData) {
  return {
    profile,
    publicModuleKeys: profile.modules.filter(isPublicModuleReadable).map((module) => module.moduleDefinition.key),
    publiclyReadable: isPublicProfileReadable(profile),
  };
}

export async function getPublicProfileProjectionBySlug(slug: string) {
  const normalized = normalizeProfileSlug(slug);
  let profile = await prisma.profile.findUnique({ where: { slug: normalized }, include: draftProfileInclude });
  if (!profile && normalized !== slug) profile = await prisma.profile.findUnique({ where: { slug }, include: draftProfileInclude });
  let historical = false;
  if (!profile) {
    const old = await prisma.profileSlugHistory.findUnique({ where: { slug: normalized }, select: { profileId: true } });
    profile = old ? await prisma.profile.findUnique({ where: { id: old.profileId }, include: draftProfileInclude }) : null;
    historical = Boolean(profile);
  }
  if (!profile) return null;
  const projection = await buildCanonicalOrLegacyProjection(profile);
  return projection ? { ...projection, canonicalSlug: profile.slug, historical } : null;
}

export async function getProfileProjectionBySlugForViewer(slug: string, viewerId?: string | null) {
  const normalized = normalizeProfileSlug(slug);
  let profile = await prisma.profile.findUnique({ where: { slug: normalized }, include: draftProfileInclude });
  if (!profile && normalized !== slug) profile = await prisma.profile.findUnique({ where: { slug }, include: draftProfileInclude });
  let historical = false;
  if (!profile) {
    const old = await prisma.profileSlugHistory.findUnique({ where: { slug: normalized }, select: { profileId: true } });
    profile = old ? await prisma.profile.findUnique({ where: { id: old.profileId }, include: draftProfileInclude }) : null;
    historical = Boolean(profile);
  }
  if (!profile) return null;
  if (viewerId && viewerId !== profile.userId && profile.lifecycle === "PUBLISHED" && profile.access !== "PRIVATE") {
    const selected = await prisma.friendsPreference.findUnique({ where: { userId: profile.userId }, select: { socialProfileId: true } });
    if (selected?.socialProfileId === profile.id && await relationshipStateForUsers(viewerId, profile.userId) === "FRIENDS") {
      const revision = await loadPublishedRevision(profile.id);
      if (revision) {
        const projected = revisionToProfileForAudience(profile, revision, "FRIEND") as unknown as PublicProfileProjectionData;
        return {
          profile: projected,
          publicModuleKeys: projected.modules.filter((item) => item.enabled && (item.visibility === "PUBLIC" || item.visibility === "FRIENDS")).map((item) => item.moduleDefinition.key),
          publiclyReadable: true,
          canonicalSlug: profile.slug,
          historical,
          audience: "FRIEND" as const,
        };
      }
    }
  }
  const projection = await buildCanonicalOrLegacyProjection(profile);
  return projection ? { ...projection, canonicalSlug: profile.slug, historical, audience: "PUBLIC" as const } : null;
}

export async function getPublicProfileProjectionById(id: string) {
  const profile = await prisma.profile.findUnique({ where: { id }, include: draftProfileInclude });
  return profile ? buildCanonicalOrLegacyProjection(profile) : null;
}

async function buildCanonicalOrLegacyProjection(profile: DraftProfileData | null) {
  if (!profile) return null;
  if (profile.lifecycle === "PAUSED" || profile.lifecycle === "ARCHIVED") {
    return { profile: profile as unknown as PublicProfileProjectionData, publicModuleKeys: [], publiclyReadable: false };
  }
  const revision = await loadPublishedRevision(profile.id);
  if (revision) {
    const projected = revisionToPublicProfile(profile, revision) as unknown as PublicProfileProjectionData;
    return buildPublicProfileProjection(projected);
  }
  // Compatibility is intentionally restricted to pre-canonical legacy rows.
  // New profiles always have profileKind and therefore cannot leak draft rows.
  if (profile.profileKind == null && profile.isPublic) {
    return buildPublicProfileProjection(profile as unknown as PublicProfileProjectionData);
  }
  return { profile: profile as unknown as PublicProfileProjectionData, publicModuleKeys: [], publiclyReadable: false };
}
