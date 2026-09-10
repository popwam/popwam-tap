import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DashboardPageHeader } from "@/components/admin-ui";
import { AdminTemplateRenderPreview } from "@/components/admin-template-render-preview";
import { approvedTemplateBySlug } from "@/lib/profile-templates";
import { getI18n } from "@/lib/i18n";

export default async function AdminTemplatePreview({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const template=approvedTemplateBySlug(slug); if(!template)notFound(); const {locale}=await getI18n(); const ar=locale==="ar"; return <><DashboardPageHeader eyebrow={`${ar?"التصميم":"Design"} ${template.source}`} title={ar?template.nameAr:template.nameEn} description={`${template.family} · ${template.profileKind} · ${template.minimumPlan.toUpperCase()}+`} action={<Link href="/admin/templates" className="btn-secondary"><ArrowLeft className="directional-icon" size={15}/>{ar?"العودة":"Back"}</Link>}/><div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10"><AdminTemplateRenderPreview slug={slug} locale={locale}/></div></>; }
