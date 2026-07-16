import { ProfileTheme, ProfileType, prisma } from "@popwam/db";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { getUserEntitlements } from "@/lib/plans";
import { isSafeDestinationUrl } from "@/lib/url";

const optional = (value: unknown) => String(value || "").trim() || null;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request); if (!user) return mobileUnauthorized();
  const { id } = await params;
  const profile = await prisma.profile.findFirst({ where: { id, userId: user.id }, include: { virtualCard: true } });
  if (!profile) return Response.json({ ok: false, error: "PROFILE_NOT_FOUND" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const type = String(body.type || profile.type) as ProfileType; const theme = String(body.theme || profile.theme) as ProfileTheme;
  if (!Object.values(ProfileType).includes(type) || !Object.values(ProfileTheme).includes(theme)) return Response.json({ ok: false, error: "PROFILE_INVALID" }, { status: 400 });
  const { effective } = await getUserEntitlements(user.id);
  if (type === "ORGANIZATION" && profile.type !== "ORGANIZATION" && !effective.allowBusinessCards) return Response.json({ ok: false, error: "BUSINESS_CARD_PLAN_REQUIRED" }, { status: 403 });
  if (Array.isArray(effective.availableThemes) && !effective.availableThemes.map(String).includes(theme)) return Response.json({ ok: false, error: "THEME_NOT_ALLOWED" }, { status: 403 });
  for (const key of ["website", "avatarUrl", "coverUrl", "logoUrl"]) { const value = optional(body[key]); if (value && !isSafeDestinationUrl(value)) return Response.json({ ok: false, error: "URL_INVALID" }, { status: 400 }); }
  const displayName = optional(body.displayNameAr) || optional(body.displayNameEn) || profile.displayName;
  await prisma.$transaction(async tx => {
    await tx.profile.update({ where: { id }, data: { type, theme, primaryLanguage: body.primaryLanguage === "en" ? "en" : "ar", displayName, displayNameAr: optional(body.displayNameAr), displayNameEn: optional(body.displayNameEn), organizationNameAr: type === "ORGANIZATION" ? optional(body.displayNameAr) : null, organizationNameEn: type === "ORGANIZATION" ? optional(body.displayNameEn) : null, firstName: optional(body.firstName), lastName: optional(body.lastName), jobTitleAr: optional(body.jobTitleAr), jobTitleEn: optional(body.jobTitleEn), company: optional(body.company), bioAr: optional(body.bioAr), bioEn: optional(body.bioEn), industryAr: optional(body.industryAr), industryEn: optional(body.industryEn), descriptionAr: optional(body.descriptionAr), descriptionEn: optional(body.descriptionEn), phone: optional(body.phone), alternatePhone: optional(body.alternatePhone), whatsappBusiness: optional(body.whatsapp), email: optional(body.email), website: optional(body.website), locationText: optional(body.location), addressAr: optional(body.addressAr) || (body.primaryLanguage !== "en" ? optional(body.location) : null), addressEn: optional(body.addressEn) || (body.primaryLanguage === "en" ? optional(body.location) : null), avatarUrl: optional(body.avatarUrl), coverUrl: optional(body.coverUrl), logoUrl: optional(body.logoUrl) } });
    if (profile.virtualCard) await tx.virtualCard.update({ where: { id: profile.virtualCard.id }, data: { name: optional(body.cardName) || displayName, ...(type === "ORGANIZATION" ? { type: "BUSINESS" } : {}) } });
  });
  return Response.json({ ok: true });
}
