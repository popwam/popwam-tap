import type { CSSProperties } from "react";
import { approvedTemplateBySlug, templateCssVariables, templateLayoutClass } from "@/lib/profile-templates";

export function TemplatePreviewCard({ slug, large = false }: { slug: string; large?: boolean }) {
  const template = approvedTemplateBySlug(slug); if (!template) return null;
  const style = templateCssVariables(template.configuration) as CSSProperties;
  return <div data-template={template.slug} data-template-family={template.family} style={style} className={`public-theme ${templateLayoutClass(template.configuration)} overflow-hidden ${large ? "min-h-[680px] rounded-[2rem] p-4 sm:p-8" : "h-56 rounded-2xl p-3"}`}>
    <div className={`profile-card mx-auto overflow-hidden rounded-[var(--profile-radius)] ${large ? "max-w-3xl" : "h-full max-w-sm"}`}><div className={`${large ? "h-44" : "h-16"} bg-[color:var(--profile-accent)] opacity-20`}/><div className={large ? "px-7 pb-8" : "px-4 pb-4"}><div className={`${large ? "-mt-12 size-24" : "-mt-7 size-14"} profile-avatar rounded-full border-4 border-[color:var(--profile-panel)] bg-[color:var(--profile-accent)]`}/><div className={`${large ? "mt-5 h-7 w-52" : "mt-3 h-3 w-28"} rounded-full bg-[color:var(--profile-text)]`}/><div className={`${large ? "mt-3 h-3 w-72" : "mt-2 h-2 w-36"} max-w-full rounded-full bg-[color:var(--profile-muted)] opacity-70`}/><div className={`mt-5 grid grid-cols-2 ${large ? "gap-4" : "gap-2"}`}>{[0,1,2,3].map(item=><div className={`profile-item rounded-[var(--item-radius)] ${large ? "h-24" : "h-9"}`} key={item}/>)}</div></div></div>
  </div>;
}
