import { Prisma, ProfileType, prisma } from "@popwam/db";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { assertWithinLimitLocked } from "@/lib/plans";

export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  const profiles = await prisma.profile.findMany({
    where: { userId: user.id },
    include: {
      destinations: { orderBy: { sortOrder: "asc" } },
      uploads: { orderBy: { sortOrder: "asc" } },
      services: { orderBy: { sortOrder: "asc" } },
      branches: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ ok: true, profiles: profiles.map(profile => ({ ...profile, uploads: profile.uploads.map(file => ({ ...file, sizeBytes: file.sizeBytes.toString() })) })) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  const body = await request.json().catch(() => ({}));
  const type = String(body.type || "PERSONAL") as ProfileType;
  if (!Object.values(ProfileType).includes(type)) return Response.json({ ok: false, error: "PROFILE_TYPE_INVALID" }, { status: 400 });
  const displayName = String(body.displayNameAr || body.displayNameEn || "").trim();
  if (!displayName) return Response.json({ ok: false, error: "PROFILE_NAME_REQUIRED" }, { status: 400 });
  try {
    const profile = await prisma.$transaction(async tx => {
      const { effective } = await assertWithinLimitLocked(tx, user.id, "profiles");
      await assertWithinLimitLocked(tx, user.id, "links", 2);
      if (Array.isArray(effective.availableProfileTypes) && !effective.availableProfileTypes.map(String).includes(type)) throw new Error("PROFILE_TYPE_NOT_ALLOWED");
      const created = await tx.profile.create({ data: {
        userId: user.id, type, displayName,
        displayNameAr: String(body.displayNameAr || "").trim() || null,
        displayNameEn: String(body.displayNameEn || "").trim() || null,
        organizationNameAr: type === "ORGANIZATION" ? String(body.displayNameAr || "").trim() || null : null,
        organizationNameEn: type === "ORGANIZATION" ? String(body.displayNameEn || "").trim() || null : null,
        primaryLanguage: body.primaryLanguage === "en" ? "en" : "ar", email: user.email,
      } });
      await tx.destination.createMany({ data: [
        { userId: user.id, profileId: created.id, type: "PROFILE", title: "Public profile", titleAr: "الملف العام", titleEn: "Public profile", url: `/p/id/${created.id}`, iconKey: "profile" },
        { userId: user.id, profileId: created.id, type: "VCF", title: "Save contact", titleAr: "حفظ جهة الاتصال", titleEn: "Save Contact", url: `/api/profiles/${created.id}/contact.vcf`, iconKey: "contact" },
      ] });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json({ ok: true, profile }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PROFILE_TYPE_NOT_ALLOWED") return Response.json({ ok: false, error: code }, { status: 403 });
    if (code === "LIMIT_REACHED:profiles") return Response.json({ ok: false, error: "PROFILE_LIMIT_REACHED" }, { status: 403 });
    console.error("mobile profile creation failed", { operation: "mobile.profile.create", userId: user.id, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ ok: false, error: "PROFILE_CREATE_FAILED" }, { status: 500 });
  }
}
