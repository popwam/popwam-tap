import Link from "next/link";
import { Eye, LockKeyhole } from "lucide-react";
import { prisma } from "@popwam/db";
import { selectProfileTemplate } from "@/app/catalog-actions";
import { PageHeading } from "@/components/page-heading";
import { TemplatePreviewCard } from "@/components/template-preview-card";
import { requireUser } from "@/lib/session";
import { getUserEntitlements } from "@/lib/plans";
import { ensureApprovedProfileTemplates } from "@/lib/figma-templates";
import { APPROVED_PROFILE_TEMPLATES } from "@/lib/profile-templates";
import { templateAllowed } from "@/lib/virtual-cards";

export default async function TemplatesPage() {
  const user=await requireUser(); await ensureApprovedProfileTemplates();
  const [cards,templates,{plan}]=await Promise.all([
    prisma.virtualCard.findMany({where:{userId:user.id,status:"ACTIVE"},include:{profile:{select:{profileKind:true,templateId:true}}},orderBy:{createdAt:"asc"}}),
    prisma.profileTemplate.findMany({where:{isActive:true,slug:{in:APPROVED_PROFILE_TEMPLATES.map(item=>item.slug)}},orderBy:{sortOrder:"asc"}}),
    getUserEntitlements(user.id),
  ]);
  return <><PageHeading eyebrow="Appearance" title="Template catalog / كتالوج القوالب" description="17 approved POP designs. Selection updates the draft; the public page changes only after publishing."/>
    <div className="space-y-8">{cards.map(card=><section key={card.id}><h2 className="mb-3 text-lg font-bold">{card.name}</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{templates.filter(item=>!item.profileKind||item.profileKind===card.profile.profileKind).map(item=>{const allowed=plan.allowThemes&&templateAllowed(plan.slug,item.minimumPlan)&&(item.category!=="storefront"||plan.storefrontEnabled);const applied=card.profile.templateId===item.id;return <article className="card overflow-hidden" key={item.id}><TemplatePreviewCard slug={item.slug}/><div className="p-4"><div className="flex items-start justify-between gap-3"><div><strong>{item.nameEn} / {item.nameAr}</strong><p className="mt-1 text-xs text-slate-500">{item.category} · {item.minimumPlan.toUpperCase()}+</p></div>{!allowed&&<LockKeyhole size={17} className="text-amber-300"/>}</div><div className="mt-4 flex gap-2"><Link className="btn-secondary flex-1" href={`/dashboard/templates/preview/${item.id}?card=${card.id}`}><Eye size={14}/>Preview</Link>{allowed?<form action={selectProfileTemplate} className="flex-1"><input type="hidden" name="virtualCardId" value={card.id}/><input type="hidden" name="templateId" value={item.id}/><button className="btn-primary w-full" disabled={applied}>{applied?"Applied":"Apply"}</button></form>:<Link className="btn-primary flex-1" href="/dashboard/plans">Upgrade</Link>}</div>{!allowed&&<p className="mt-3 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-200">This design is not included in the active plan. Preview remains available.</p>}</div></article>})}</div></section>)}</div></>;
}
