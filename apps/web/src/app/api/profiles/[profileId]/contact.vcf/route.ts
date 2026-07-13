import { prisma } from "@popwam/db";
import { createVCard, safeVCardFilename } from "@/lib/vcard";

export async function GET(_request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const profile = await prisma.profile.findFirst({ where: { id: profileId, isPublic: true } });
  if (!profile) return new Response("Not found", { status: 404 });
  const ar = profile.primaryLanguage !== "en";
  const localized = (arValue: string | null, enValue: string | null, legacy?: string | null) => ar ? arValue || enValue || legacy : enValue || arValue || legacy;
  const displayName = profile.type === "ORGANIZATION"
    ? localized(profile.organizationNameAr, profile.organizationNameEn, profile.displayName)!
    : localized(profile.displayNameAr, profile.displayNameEn, profile.displayName)!;
  const body = createVCard({
    kind: profile.type === "ORGANIZATION" ? "org" : "individual",
    firstName: profile.firstName, lastName: profile.lastName, displayName,
    organization: profile.type === "ORGANIZATION" ? displayName : profile.company,
    title: localized(profile.jobTitleAr, profile.jobTitleEn, profile.title),
    phones: [profile.phone, profile.alternatePhone],
    whatsapp: profile.whatsappBusiness || profile.whatsappPrivate,
    email: profile.email, website: profile.website,
    address: localized(profile.addressAr, profile.addressEn, profile.locationText),
    notes: localized(profile.contactNotesAr, profile.contactNotesEn),
    photoUrl: profile.type === "ORGANIZATION" ? profile.logoUrl : profile.avatarUrl,
  });
  return new Response(body, { headers: {
    "content-type": "text/vcard; charset=utf-8",
    "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeVCardFilename(displayName))}`,
    "cache-control": "no-store",
  } });
}
