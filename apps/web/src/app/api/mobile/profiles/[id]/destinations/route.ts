import { DestinationType, Prisma, prisma } from "@popwam/db";
import { defaultIconKeys, safeIconKey } from "@popwam/shared";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { assertWithinLimitLocked } from "@/lib/plans";
import { normalizeAndValidate } from "@/lib/url";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request); if (!user) return mobileUnauthorized(); const { id } = await params;
  if (!await prisma.profile.findFirst({ where: { id, userId: user.id } })) return Response.json({ ok: false, error: "PROFILE_NOT_FOUND" }, { status: 404 });
  const destinations = await prisma.destination.findMany({ where: { profileId: id, userId: user.id }, orderBy: { sortOrder: "asc" } });
  return Response.json({ ok: true, destinations }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request); if (!user) return mobileUnauthorized(); const { id } = await params;
  const body = await request.json().catch(() => ({})); const type = String(body.type || "") as DestinationType;
  if (!Object.values(DestinationType).includes(type) || type === "PROFILE") return Response.json({ ok: false, error: "DESTINATION_INVALID" }, { status: 400 });
  const normalized = normalizeAndValidate(type, String(body.url || ""));
  if (!normalized.valid) return Response.json({ ok: false, error: "DESTINATION_URL_INVALID" }, { status: 400 });
  const title = String(body.titleAr || body.titleEn || "").trim();
  if (!title) return Response.json({ ok: false, error: "DESTINATION_TITLE_REQUIRED" }, { status: 400 });
  try {
    const destination = await prisma.$transaction(async tx => {
      if (!await tx.profile.findFirst({ where: { id, userId: user.id }, select: { id: true } })) throw new Error("PROFILE_NOT_FOUND");
      await assertWithinLimitLocked(tx, user.id, "links");
      const sortOrder = await tx.destination.count({ where: { profileId: id } });
      return tx.destination.create({ data: { userId: user.id, profileId: id, type, title, titleAr: String(body.titleAr || "").trim() || null, titleEn: String(body.titleEn || "").trim() || null, url: normalized.url, iconKey: safeIconKey(String(body.iconKey || ""), defaultIconKeys[type]), sortOrder } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json({ ok: true, destination }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PROFILE_NOT_FOUND") return Response.json({ ok: false, error: code }, { status: 404 });
    if (code === "LIMIT_REACHED:links") return Response.json({ ok: false, error: "LINK_LIMIT_REACHED" }, { status: 403 });
    console.error("mobile destination creation failed", { operation: "mobile.destination.create", userId: user.id, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ ok: false, error: "DESTINATION_CREATE_FAILED" }, { status: 500 });
  }
}
