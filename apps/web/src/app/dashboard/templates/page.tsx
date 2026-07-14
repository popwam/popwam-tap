import { prisma } from "@popwam/db";
import { selectProfileTemplate } from "@/app/catalog-actions";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/session";
import { getUserEntitlements } from "@/lib/plans";
import { templateCssVariables } from "@/lib/profile-templates";
import { templateAllowed } from "@/lib/virtual-cards";

export default async function TemplatesPage() {
  const user = await requireUser();
  const [cards, templates, { plan }] = await Promise.all([prisma.virtualCard.findMany({ where: { userId: user.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" } }), prisma.profileTemplate.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] }), getUserEntitlements(user.id)]);
  return <><PageHeading eyebrow="Appearance" title="Template catalog / كتالوج القوالب" description="Preview every catalog entry. Locked templates show the plan that enables them and cannot be selected server-side."/><div className="space-y-7">{cards.map(card => <section key={card.id}><h2 className="mb-3 text-lg font-bold">{card.name}</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{templates.map(template => { const allowed = templateAllowed(plan.slug, template.minimumPlan); const style = templateCssVariables(template.configuration); return <article className="overflow-hidden rounded-3xl border border-white/10" style={{ background: style["--profile-bg"] || "#111313", color: style["--profile-text"] || "#fff", borderRadius: style["--profile-radius"] }} key={template.id}><div className="h-24 p-5" style={{ background: style["--profile-panel"] || "#191c1c" }}><div className="h-4 w-1/2 rounded" style={{ background: style["--profile-accent"] || "#55d6a5" }}/><div className="mt-3 h-2 w-4/5 rounded bg-current opacity-20"/></div><div className="p-4"><strong>{template.nameEn} / {template.nameAr}</strong><p className="mt-1 text-xs opacity-60">{template.category} · {template.minimumPlan}+</p>{allowed ? <form action={selectProfileTemplate} className="mt-3"><input type="hidden" name="virtualCardId" value={card.id}/><input type="hidden" name="templateId" value={template.id}/><button className="btn-secondary w-full" disabled={card.themeId === template.id}>{card.themeId === template.id ? "Selected" : "Select"}</button></form> : <div className="mt-3 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-200">Upgrade to {template.minimumPlan.toUpperCase()} to unlock.</div>}</div></article>; })}</div></section>)}</div></>;
}
