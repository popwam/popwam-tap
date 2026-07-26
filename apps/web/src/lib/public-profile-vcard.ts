import "server-only";
import { createVCard, safeVCardFilename } from "./vcard";
import { getPublicProfileProjectionById, moduleUsesCanonicalPublicState } from "./profile-projection";

export async function publicProfileVCardResponse(profileId: string) {
  const projection = await getPublicProfileProjectionById(profileId);
  if (!projection?.publiclyReadable) return new Response("Not found", { status: 404 });
  const profile = projection.profile;
  const identityPublic = moduleUsesCanonicalPublicState(profile, "IDENTITY", true);
  const contactPublic = moduleUsesCanonicalPublicState(profile, "CONTACT", true);
  if (!contactPublic || !profile.showSaveContact) return new Response("Not found", { status: 404 });
  const ar = profile.primaryLanguage !== "en";
  const localized = (arValue: string | null, enValue: string | null, legacy?: string | null) => ar ? arValue || enValue || legacy : enValue || arValue || legacy;
  const displayName = profile.type === "ORGANIZATION"
    ? localized(profile.organizationNameAr, profile.organizationNameEn, profile.displayName)!
    : localized(profile.displayNameAr, profile.displayNameEn, profile.displayName)!;
  const body = createVCard({
    kind: profile.type === "ORGANIZATION" ? "org" : "individual",
    firstName: null,
    lastName: null,
    displayName,
    organization: profile.type === "ORGANIZATION" ? displayName : profile.company,
    title: localized(profile.jobTitleAr, profile.jobTitleEn, profile.title),
    phones: contactPublic && profile.showPhone ? [profile.phone, profile.alternatePhone] : [],
    whatsapp: contactPublic ? (profile.showWhatsappBusiness ? profile.whatsappBusiness : null) || (profile.showWhatsappPrivate ? profile.whatsappPrivate : null) : null,
    email: contactPublic && profile.showEmail ? profile.email : null,
    website: contactPublic && profile.showWebsite ? profile.website : null,
    address: contactPublic && profile.showLocation ? localized(profile.addressAr, profile.addressEn, profile.locationText) : null,
    notes: null,
    photoUrl: identityPublic && profile.showAvatar ? (profile.type === "ORGANIZATION" ? profile.logoUrl : profile.avatarUrl) : null,
  });
  return new Response(body, { headers: {
    "content-type": "text/vcard; charset=utf-8",
    "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeVCardFilename(displayName))}`,
    "cache-control": "no-store",
  } });
}
