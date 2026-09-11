import { prisma } from "@popwam/db";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { getUserEntitlements } from "@/lib/plans";
import { APPROVED_PROFILE_TEMPLATES, approvedTemplateBySlug } from "@/lib/profile-templates";
import { templateSelectionError, safeTemplateThumbnail } from "@/lib/mobile-showcase-policy";

export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  const [{ plan, effective }, templates] = await Promise.all([
    getUserEntitlements(user.id),
    prisma.profileTemplate.findMany({
      where: { slug: { in: APPROVED_PROFILE_TEMPLATES.map(item => item.slug) } },
      select: { id: true, slug: true, nameAr: true, nameEn: true, profileKind: true, minimumPlan: true, isActive: true, previewImageUrl: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    }),
  ]);
  return Response.json({ ok: true, planSlug: plan.slug, templates: templates.map(item => {
    const approved = approvedTemplateBySlug(item.slug)!;
    return { id: item.id, slug: item.slug, nameAr: item.nameAr, nameEn: item.nameEn, minimumPlan: item.minimumPlan, isActive: item.isActive, family: approved.family, variant: approved.variant, profileKind: approved.profileKind,
      // Approved registry artwork, no renderer/configuration/source assets in this DTO.
      previewImageUrl: safeTemplateThumbnail(item.previewImageUrl) || `/api/mobile/templates/${item.slug}/thumbnail`,
      allowed: templateSelectionError(item, approved.profileKind, plan.slug, effective) === null };
  }) }, { headers: { "cache-control": "private, no-store" } });
}
