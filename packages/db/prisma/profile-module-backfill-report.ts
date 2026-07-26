import { DestinationType, ProfileFieldType, prisma } from "../src";
import { summarizeProfileModuleBackfill } from "../../../apps/web/src/lib/profile-backfill";

/**
 * Read-only Phase B migration planning report. There is deliberately no write
 * flag or write path in this script. It outputs IDs and counts only.
 */
async function main() {
  const profiles = await prisma.profile.findMany({
    select: {
      id: true,
      displayName: true,
      bio: true,
      bioAr: true,
      bioEn: true,
      descriptionAr: true,
      descriptionEn: true,
      phone: true,
      alternatePhone: true,
      whatsappBusiness: true,
      whatsappPrivate: true,
      email: true,
      website: true,
      facebook: true,
      linkedin: true,
      github: true,
      tiktok: true,
      fields: { select: { type: true } },
      destinations: { select: { type: true } },
      uploads: { select: { id: true } },
      services: { select: { id: true } },
      branches: { select: { id: true } },
    },
    orderBy: { id: "asc" },
  });
  const summaries = profiles.map((profile) => {
    const contactFieldTypes: ProfileFieldType[] = [ProfileFieldType.PHONE, ProfileFieldType.EMAIL, ProfileFieldType.WHATSAPP, ProfileFieldType.LOCATION];
    const socialDestinationTypes: DestinationType[] = [DestinationType.FACEBOOK, DestinationType.LINKEDIN, DestinationType.GITHUB, DestinationType.TIKTOK, DestinationType.INSTAGRAM, DestinationType.X, DestinationType.YOUTUBE, DestinationType.TELEGRAM, DestinationType.SOCIAL];
    const builtInDestinationTypes: DestinationType[] = [DestinationType.PROFILE, DestinationType.VCF];
    const typedContactFields = profile.fields.filter((field) => contactFieldTypes.includes(field.type)).length;
    const socialDestinationCount = profile.destinations.filter((destination) => socialDestinationTypes.includes(destination.type)).length;
    const linkCount = profile.destinations.filter((destination) => !builtInDestinationTypes.includes(destination.type)).length;
    return summarizeProfileModuleBackfill({
      profileId: profile.id,
      hasDisplayName: Boolean(profile.displayName.trim()),
      hasAbout: Boolean(profile.bio || profile.bioAr || profile.bioEn || profile.descriptionAr || profile.descriptionEn),
      contactCount: [profile.phone, profile.alternatePhone, profile.whatsappBusiness, profile.whatsappPrivate, profile.email, profile.website].filter(Boolean).length + typedContactFields,
      directSocialCount: [profile.facebook, profile.linkedin, profile.github, profile.tiktok].filter(Boolean).length,
      socialDestinationCount,
      linkCount,
      uploadCount: profile.uploads.length,
      serviceCount: profile.services.length,
      branchCount: profile.branches.length,
      unsupportedFieldCount: profile.fields.filter((field) => field.type === ProfileFieldType.CUSTOM).length,
    });
  });
  const totals = summaries.reduce((result, summary) => ({
    profiles: result.profiles + 1,
    mapped: result.mapped + summary.mapped.length,
    missing: result.missing + summary.missing.length,
    ambiguous: result.ambiguous + summary.ambiguous.length,
    duplicate: result.duplicate + summary.duplicate.length,
    unsupported: result.unsupported + summary.unsupported,
  }), { profiles: 0, mapped: 0, missing: 0, ambiguous: 0, duplicate: 0, unsupported: 0 });
  console.log(JSON.stringify({ mode: "DRY_RUN", writesImplemented: false, totals, profiles: summaries }, null, 2));
}

main().catch((error) => { console.error("PHASE_B_PROFILE_MODULE_DRY_RUN_FAILED", error instanceof Error ? error.name : "unknown"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
