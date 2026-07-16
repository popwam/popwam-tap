import { prisma } from "@popwam/db";
import { ensureFigmaTemplates, FIGMA_TEMPLATES } from "@/lib/figma-templates";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { getUserEntitlements } from "@/lib/plans";
import { templateAllowed } from "@/lib/virtual-cards";

export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  await ensureFigmaTemplates();
  const [{ plan }, templates] = await Promise.all([
    getUserEntitlements(user.id),
    prisma.profileTemplate.findMany({
      where: { isActive: true, slug: { in: FIGMA_TEMPLATES.map(template => template.slug) } },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    }),
  ]);
  return Response.json({
    ok: true,
    planSlug: plan.slug,
    templates: templates.map(template => ({
      ...template,
      previewImageUrl: template.previewImageUrl ? new URL(template.previewImageUrl, request.url).toString() : null,
      allowed: templateAllowed(plan.slug, template.minimumPlan),
    })),
  }, { headers: { "cache-control": "no-store" } });
}
