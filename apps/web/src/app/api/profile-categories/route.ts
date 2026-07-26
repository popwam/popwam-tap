import { prisma } from "@popwam/db";

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("profileKind");
  if (kind !== "PERSONAL" && kind !== "BUSINESS") return Response.json({ ok: false, error: "PROFILE_KIND_INVALID" }, { status: 400 });
  const categories = await prisma.profileCategory.findMany({ where: { isActive: true, profileKind: kind }, select: { id: true, slug: true, profileKind: true, nameEn: true, nameAr: true, descriptionEn: true, descriptionAr: true, defaultTemplateId: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
  return Response.json({ ok: true, categories }, { headers: { "cache-control": "no-store" } });
}
