import { prisma } from "@popwam/db";

const localized = (locale: "ar" | "en", ar: string | null, en: string | null, fallback = "") =>
  (locale === "ar" ? ar || en : en || ar) || fallback;

export function normalizeDiscoveryQuery(value: unknown) {
  const query = String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
  return query.length >= 2 ? query : null;
}

export async function discoverPublic(locale: "ar" | "en", rawQuery: unknown) {
  const query = normalizeDiscoveryQuery(rawQuery);
  const text = query ? { contains: query, mode: "insensitive" as const } : undefined;
  const profiles = await prisma.profile.findMany({
    where: {
      lifecycle: "PUBLISHED", access: "PUBLIC", slug: { not: null }, publication: { isNot: null },
      ...(query ? { publication: { is: { publishedRevision: { is: { OR: [
        { displayName: text }, { displayNameAr: text }, { displayNameEn: text }, { slug: text },
        { services: { some: { OR: [{ nameAr: text }, { nameEn: text }, { descriptionAr: text }, { descriptionEn: text }] } } },
      ] } } } } } : {}),
    },
    select: {
      id: true, profileKind: true, type: true,
      selectedForFriends: { select: { discoverableByProfileSearch: true }, take: 1 },
      publication: { select: { publishedRevision: { select: {
        slug: true, displayName: true, displayNameAr: true, displayNameEn: true,
        title: true, jobTitleAr: true, jobTitleEn: true, avatarUrl: true, logoUrl: true,
        services: { take: 12, orderBy: { sortOrder: "asc" } },
        modules: { where: { key: "SERVICES", enabled: true, visibility: "PUBLIC" }, select: { id: true } },
      } } } },
    },
    orderBy: { updatedAt: "desc" }, take: query ? 30 : 48,
  });
  const publicProfiles = profiles.flatMap((profile) => {
    const revision = profile.publication?.publishedRevision;
    if (!revision?.slug) return [];
    const business = profile.profileKind === "BUSINESS" || profile.type === "ORGANIZATION";
    if (!business && !profile.selectedForFriends.some((value) => value.discoverableByProfileSearch)) return [];
    return [{
      id: profile.id, slug: revision.slug,
      name: localized(locale, revision.displayNameAr, revision.displayNameEn, revision.displayName),
      title: localized(locale, revision.jobTitleAr, revision.jobTitleEn, revision.title || "") || null,
      imageUrl: (business ? revision.logoUrl || revision.avatarUrl : revision.avatarUrl) || null,
      kind: business ? "BUSINESS" as const : "PERSON" as const,
    }];
  });
  const services = profiles.flatMap((profile) => {
    const revision = profile.publication?.publishedRevision;
    if (!revision?.slug || !revision.modules.length) return [];
    const profileName = localized(locale, revision.displayNameAr, revision.displayNameEn, revision.displayName);
    return revision.services.map((service) => ({
      id: service.sourceId, name: localized(locale, service.nameAr, service.nameEn),
      description: localized(locale, service.descriptionAr, service.descriptionEn) || null,
      profileSlug: revision.slug, profileName,
      profileImageUrl: revision.logoUrl || revision.avatarUrl || null,
    })).filter((service) => service.name);
  });
  // Rotate the non-search catalog daily so Home remains varied without an expensive random DB sort.
  const offset = query || !services.length ? 0 : Math.floor(Date.now() / 86_400_000) % services.length;
  const rotated = services.slice(offset).concat(services.slice(0, offset));
  return { profiles: publicProfiles.slice(0, 20), services: rotated.slice(0, query ? 20 : 12) };
}
