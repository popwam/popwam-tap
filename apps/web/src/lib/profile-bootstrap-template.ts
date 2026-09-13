import { type Prisma, type ProfileKind } from "@popwam/db";
import { approvedTemplateBySlug, resolveApprovedTemplate } from "./profile-templates";
import { templateAllowed } from "./virtual-cards";

/** Profile existence never depends on client catalog metadata or an obsolete category default. */
export async function resolveInitialTemplate(tx: Prisma.TransactionClient, kind: ProfileKind, selectedId: string | null | undefined, planSlug: string) {
  if (selectedId) {
    const selected = await tx.profileTemplate.findUnique({ where: { id: selectedId } });
    const approved = approvedTemplateBySlug(selected?.slug);
    if (selected?.isActive && selected.profileKind === kind && approved?.profileKind === kind &&
        templateAllowed(planSlug, selected.minimumPlan) && templateAllowed(planSlug, approved.minimumPlan)) return selected;
  }
  const fallback = resolveApprovedTemplate({ profileKind: kind });
  // Missing seed metadata is repaired from the canonical registry. Existing Admin activation
  // is preserved; an inactive default leaves templateId null and uses renderer fallback.
  const row = await tx.profileTemplate.upsert({ where: { slug: fallback.slug }, update: {}, create: {
    slug: fallback.slug, nameAr: fallback.nameAr, nameEn: fallback.nameEn,
    category: fallback.family, profileKind: kind, minimumPlan: fallback.minimumPlan,
    configuration: fallback.configuration, sortOrder: fallback.source,
  } });
  return row.isActive && row.profileKind === kind ? row : null;
}
