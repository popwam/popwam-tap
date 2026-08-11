import { notFound } from "next/navigation";
import { prisma } from "@popwam/db";
import { PublicProfile } from "@/components/public-profile";
import { requireUser } from "@/lib/session";
import { getOwnedDraft, legacyDraftToPublicProfile } from "@/lib/profile-publishing";

export default async function TemplatePreviewPage({params,searchParams}:{params:Promise<{templateId:string}>;searchParams:Promise<{card?:string}>}){const user=await requireUser();const [{templateId},{card:cardId}]=await Promise.all([params,searchParams]);const [template,card]=await Promise.all([prisma.profileTemplate.findFirst({where:{id:templateId,isActive:true}}),prisma.virtualCard.findFirst({where:{id:cardId,userId:user.id},select:{profileId:true}})]);if(!template||!card)notFound();const profile=await getOwnedDraft(user.id,card.profileId);if(!profile||!profile.virtualCard)notFound();const preview=legacyDraftToPublicProfile({...profile,virtualCard:{...profile.virtualCard,template}});return <div><div className="sticky top-3 z-30 mx-auto mb-3 flex max-w-xl items-center justify-between rounded-xl border border-white/10 bg-slate-950/95 p-3"><strong>Live preview: {template.nameEn}</strong><a className="btn-secondary" href="/dashboard/templates">Back</a></div><PublicProfile profile={preview}/></div>}
