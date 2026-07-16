import { prisma } from "@popwam/db";
import { ensureFigmaTemplates } from "@/lib/figma-templates";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { getUserEntitlements } from "@/lib/plans";
import { templateAllowed } from "@/lib/virtual-cards";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  await ensureFigmaTemplates();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const templateId = String(body.templateId || "");
  const [card, template, { plan }] = await Promise.all([
    prisma.virtualCard.findFirst({ where: { id, userId: user.id, status: { not: "ARCHIVED" } }, select: { id: true, profileId: true } }),
    prisma.profileTemplate.findFirst({ where: { id: templateId, isActive: true } }),
    getUserEntitlements(user.id),
  ]);
  if (!card || !template) return Response.json({ ok: false, error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
  if (!templateAllowed(plan.slug, template.minimumPlan)) return Response.json({ ok: false, error: "TEMPLATE_PLAN_REQUIRED" }, { status: 403 });
  await prisma.$transaction([
    prisma.virtualCard.update({ where: { id: card.id }, data: { themeId: template.id } }),
    prisma.auditLog.create({ data: { actorId: user.id, operation: "mobile.virtual_card.template.select", targetId: card.id, metadata: { templateId } } }),
  ]);
  return Response.json({ ok: true, template });
}
