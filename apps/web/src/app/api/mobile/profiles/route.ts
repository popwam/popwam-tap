import { Prisma, prisma } from "@popwam/db";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { assertWithinLimitLocked } from "@/lib/plans";
import { canCreateVirtualCard, profileTypeForVirtualCard, VIRTUAL_CARD_TYPES, type VirtualCardTypeValue } from "@/lib/virtual-cards";

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
      virtualCard: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ ok: true, profiles: profiles.map(profile => ({ ...profile, uploads: profile.uploads.map(file => ({ ...file, sizeBytes: file.sizeBytes.toString() })) })) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  const body = await request.json().catch(() => ({}));
  const cardType = String(body.cardType || (body.type === "ORGANIZATION" ? "BUSINESS" : body.type) || "PERSONAL") as VirtualCardTypeValue;
  if (!VIRTUAL_CARD_TYPES.includes(cardType)) return Response.json({ ok: false, error: "VIRTUAL_CARD_TYPE_INVALID" }, { status: 400 });
  const displayName = String(body.displayNameAr || body.displayNameEn || "").trim();
  if (!displayName) return Response.json({ ok: false, error: "PROFILE_NAME_REQUIRED" }, { status: 400 });
  try {
    const profile = await prisma.$transaction(async tx => {
      const { effective, used } = await assertWithinLimitLocked(tx, user.id, "virtualCards");
      await assertWithinLimitLocked(tx, user.id, "profiles");
      await assertWithinLimitLocked(tx, user.id, "links", 2);
      const decision = canCreateVirtualCard({ maxVirtualCards: Number(effective.maxVirtualCards), allowBusinessCards: Boolean(effective.allowBusinessCards) }, used, cardType);
      if (!decision.allowed) throw new Error(decision.reason);
      const type = profileTypeForVirtualCard(cardType);
      const created = await tx.profile.create({ data: {
        userId: user.id, type, displayName,
        displayNameAr: String(body.displayNameAr || "").trim() || null,
        displayNameEn: String(body.displayNameEn || "").trim() || null,
        organizationNameAr: type === "ORGANIZATION" ? String(body.displayNameAr || "").trim() || null : null,
        organizationNameEn: type === "ORGANIZATION" ? String(body.displayNameEn || "").trim() || null : null,
        primaryLanguage: body.primaryLanguage === "en" ? "en" : "ar", email: user.email,
      } });
      await tx.virtualCard.create({ data: { userId: user.id, name: displayName, type: cardType, profileId: created.id, isDefault: used === 0 } });
      await tx.destination.createMany({ data: [
        { userId: user.id, profileId: created.id, type: "PROFILE", title: "Public profile", titleAr: "الملف العام", titleEn: "Public profile", url: `/p/id/${created.id}`, iconKey: "profile" },
        { userId: user.id, profileId: created.id, type: "VCF", title: "Save contact", titleAr: "حفظ جهة الاتصال", titleEn: "Save Contact", url: `/api/profiles/${created.id}/contact.vcf`, iconKey: "contact" },
      ] });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json({ ok: true, profile }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["BUSINESS_CARD_PLAN_REQUIRED", "VIRTUAL_CARD_LIMIT_REACHED"].includes(code)) return Response.json({ ok: false, error: code }, { status: 403 });
    if (code === "LIMIT_REACHED:virtualCards" || code === "LIMIT_REACHED:profiles") return Response.json({ ok: false, error: "VIRTUAL_CARD_LIMIT_REACHED" }, { status: 403 });
    console.error("mobile profile creation failed", { operation: "mobile.profile.create", userId: user.id, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ ok: false, error: "PROFILE_CREATE_FAILED" }, { status: 500 });
  }
}
