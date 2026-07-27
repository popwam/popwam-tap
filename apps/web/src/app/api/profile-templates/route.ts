import { prisma } from "@popwam/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const profileKind = url.searchParams.get("profileKind");
  const categorySlug = url.searchParams.get("categorySlug");
  if (profileKind !== "PERSONAL" && profileKind !== "BUSINESS") return Response.json({ ok: false, error: "PROFILE_KIND_INVALID" }, { status: 400 });
  const category = categorySlug ? await prisma.profileCategory.findFirst({ where: { slug: categorySlug, isActive: true, profileKind } }) : null;
  if (categorySlug && !category) return Response.json({ ok: false, error: "PROFILE_CATEGORY_INCOMPATIBLE" }, { status: 400 });
  const templates = await prisma.profileTemplate.findMany({
    where: { isActive: true, AND: [{ OR: [{ profileKind: null }, { profileKind }] }, { OR: [{ categoryId: null }, ...(category ? [{ categoryId: category.id }] : [])] }] },
    select: { id: true, slug: true, nameEn: true, nameAr: true, category: true, categoryId: true, profileKind: true, previewImageUrl: true, configuration: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
  return Response.json({
    ok: true,
    // This is canonical eligibility metadata, not title-based inference. The query above
    // remains the authority that filters every returned template for the selected profile.
    templates: templates.map((template) => ({
      ...template,
      categorySlug: category?.id === template.categoryId ? category.slug : null,
      previewImageUrl: template.previewImageUrl ? new URL(template.previewImageUrl, request.url).toString() : null,
    })),
    defaultTemplateId: category?.defaultTemplateId || null,
  }, { headers: { "cache-control": "no-store" } });
}
