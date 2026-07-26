import { prisma } from "@popwam/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const profileKind = url.searchParams.get("profileKind");
  const categorySlug = url.searchParams.get("categorySlug");
  if (profileKind !== "PERSONAL" && profileKind !== "BUSINESS") return Response.json({ ok: false, error: "PROFILE_KIND_INVALID" }, { status: 400 });
  const category = categorySlug ? await prisma.profileCategory.findFirst({ where: { slug: categorySlug, isActive: true, profileKind } }) : null;
  if (categorySlug && !category) return Response.json({ ok: false, error: "PROFILE_CATEGORY_INCOMPATIBLE" }, { status: 400 });
  const templates = await prisma.profileTemplate.findMany({ where: { isActive: true, AND: [{ OR: [{ profileKind: null }, { profileKind }] }, { OR: [{ categoryId: null }, ...(category ? [{ categoryId: category.id }] : [])] }] }, select: { id: true, slug: true, nameEn: true, nameAr: true, categoryId: true, profileKind: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
  return Response.json({ ok: true, templates, defaultTemplateId: category?.defaultTemplateId || null }, { headers: { "cache-control": "no-store" } });
}
