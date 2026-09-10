"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Check, ExternalLink, Pencil, Plus, Power, Smartphone, Upload, Users, X } from "lucide-react";
import { saveLinkPlatform, toggleLinkPlatform } from "@/app/catalog-actions";
import { DestinationIcon } from "@/components/destination-icon";
import { StatusBadge } from "@/components/admin-ui";
import { ConfirmSubmit } from "@/components/confirm-submit";

export type LinkPlatformAdminItem = {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  iconKey: string | null;
  customIconUrl: string | null;
  placeholder: string;
  validationPattern: string | null;
  category: string;
  inputType: string;
  urlTemplate: string | null;
  androidAppUrl: string | null;
  iosAppUrl: string | null;
  webFallback: string | null;
  helpAr: string | null;
  helpEn: string | null;
  isActive: boolean;
  sortOrder: number;
  allowCustomLabel: boolean;
  allowCustomIcon: boolean;
  usageCount: number;
};

type Copy = {
  add: string; edit: string; close: string; save: string; disable: string; enable: string;
  used: string; builder: string; validation: string; appLinks: string; fallback: string;
  noBuilder: string; noValidation: string; none: string; identity: string; behavior: string;
  guidance: string; options: string; icon: string; upload: string; active: string;
  customLabel: string; customIcon: string; disableConfirm: string;
};

const inputTypes = ["USERNAME", "PHONE", "EMAIL", "FULL_URL", "USERNAME_OR_URL", "CHANNEL_ID", "CUSTOM_TEXT"];

function PlatformIcon({ platform, size = "normal" }: { platform: LinkPlatformAdminItem; size?: "normal" | "large" }) {
  const dimensions = size === "large" ? "h-16 w-16" : "h-12 w-12";
  return <span className={`${dimensions} grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[.055] text-brand-300 shadow-sm`}>
    {platform.customIconUrl ? <img src={platform.customIconUrl} alt="" className="h-full w-full object-contain"/> : <DestinationIcon type="CUSTOM_URL" iconKey={platform.iconKey} className={size === "large" ? "h-8 w-8" : "h-6 w-6"}/>} 
  </span>;
}

function PlatformForm({ platform, copy, onDone }: { platform: LinkPlatformAdminItem | null; copy: Copy; onDone: () => void }) {
  const [preview, setPreview] = useState(platform?.customIconUrl || "");
  const onIcon = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  };
  return <form action={async data => { await saveLinkPlatform(data); onDone(); }} className="grid gap-5">
    {platform && <input type="hidden" name="id" value={platform.id}/>} 
    <section><h3 className="admin-eyebrow mb-3">{copy.identity}</h3><div className="grid gap-3 sm:grid-cols-2">
      <label><span className="label">English name</span><input className="input" name="nameEn" defaultValue={platform?.nameEn} required maxLength={100}/></label>
      <label><span className="label">الاسم العربي</span><input className="input" name="nameAr" defaultValue={platform?.nameAr} required maxLength={100} dir="rtl"/></label>
      <label><span className="label">Slug</span><input className="input" name="slug" defaultValue={platform?.slug} pattern="[a-z0-9-]{2,48}" required dir="ltr"/></label>
      <label><span className="label">Category</span><input className="input" name="category" defaultValue={platform?.category || "SOCIAL"} required maxLength={50}/></label>
      <label><span className="label">Input mode</span><select className="input" name="inputType" defaultValue={platform?.inputType || "FULL_URL"}>{inputTypes.map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span className="label">Sort order</span><input className="input" name="sortOrder" type="number" min="0" defaultValue={platform?.sortOrder || 0}/></label>
    </div></section>
    <section><h3 className="admin-eyebrow mb-3">{copy.behavior}</h3><div className="grid gap-3 sm:grid-cols-2">
      <label><span className="label">Placeholder</span><input className="input" name="placeholder" defaultValue={platform?.placeholder} required maxLength={200}/></label>
      <label><span className="label">Icon key</span><input className="input" name="iconKey" defaultValue={platform?.iconKey || "link"} maxLength={50}/></label>
      <label className="sm:col-span-2"><span className="label">URL template</span><input className="input" name="urlTemplate" defaultValue={platform?.urlTemplate || ""} placeholder="https://example.com/{value}" dir="ltr"/></label>
      <label className="sm:col-span-2"><span className="label">Validation regex</span><input className="input" name="validationPattern" defaultValue={platform?.validationPattern || ""} maxLength={200} dir="ltr"/></label>
      <label><span className="label">Android app URL</span><input className="input" name="androidAppUrl" defaultValue={platform?.androidAppUrl || ""} dir="ltr"/></label>
      <label><span className="label">iOS app URL</span><input className="input" name="iosAppUrl" defaultValue={platform?.iosAppUrl || ""} dir="ltr"/></label>
      <label className="sm:col-span-2"><span className="label">Web fallback</span><input className="input" name="webFallback" defaultValue={platform?.webFallback || ""} dir="ltr"/></label>
    </div></section>
    <section><h3 className="admin-eyebrow mb-3">{copy.guidance}</h3><div className="grid gap-3 sm:grid-cols-2">
      <label><span className="label">English help</span><textarea className="input min-h-24" name="helpEn" defaultValue={platform?.helpEn || ""} maxLength={1000}/></label>
      <label><span className="label">المساعدة بالعربية</span><textarea className="input min-h-24" name="helpAr" defaultValue={platform?.helpAr || ""} maxLength={1000} dir="rtl"/></label>
    </div></section>
    <section><h3 className="admin-eyebrow mb-3">{copy.icon}</h3><div className="grid items-center gap-3 sm:grid-cols-[auto_1fr]">
      <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/[.04]">{preview ? <img src={preview} alt="" className="h-full w-full object-contain"/> : <Upload size={22} className="text-slate-500"/>}</span>
      <div className="grid gap-3"><input className="input" name="customIconUrl" defaultValue={platform?.customIconUrl || ""} placeholder="Existing public icon URL" dir="ltr" onChange={e => setPreview(e.target.value)}/><label className="input flex cursor-pointer items-center gap-2"><Upload size={16}/>{copy.upload}<input className="sr-only" type="file" name="iconFile" accept="image/jpeg,image/png,image/webp" onChange={onIcon}/></label></div>
    </div></section>
    <section><h3 className="admin-eyebrow mb-3">{copy.options}</h3><div className="grid gap-3 sm:grid-cols-3">
      <label className="flex items-center gap-2 rounded-xl border border-white/10 p-3"><input type="checkbox" name="isActive" defaultChecked={platform?.isActive ?? true}/>{copy.active}</label>
      <label className="flex items-center gap-2 rounded-xl border border-white/10 p-3"><input type="checkbox" name="allowCustomLabel" defaultChecked={platform?.allowCustomLabel}/>{copy.customLabel}</label>
      <label className="flex items-center gap-2 rounded-xl border border-white/10 p-3"><input type="checkbox" name="allowCustomIcon" defaultChecked={platform?.allowCustomIcon}/>{copy.customIcon}</label>
    </div></section>
    <footer className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-white/10 bg-[color:var(--app-surface)] px-5 py-4 sm:-mx-7 sm:-mb-7 sm:px-7"><button type="button" className="btn-secondary" onClick={onDone}>{copy.close}</button><button className="btn-primary"><Check size={16}/>{copy.save}</button></footer>
  </form>;
}

export function LinkPlatformAdminCatalog({ platforms, copy }: { platforms: LinkPlatformAdminItem[]; copy: Copy }) {
  const [selected, setSelected] = useState<LinkPlatformAdminItem | null | undefined>(undefined);
  useEffect(() => {
    if (selected === undefined) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(undefined); };
    document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close);
  }, [selected]);
  return <>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{platforms.map(platform => <article className="admin-section-card group flex min-h-72 flex-col" key={platform.id}>
      <header className="flex items-start gap-3"><PlatformIcon platform={platform}/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="truncate">{platform.nameEn}</h2><p className="truncate text-sm text-slate-400" dir="rtl">{platform.nameAr}</p></div><StatusBadge value={platform.isActive ? "ACTIVE" : "DISABLED"}/></div><p className="mt-1 font-mono text-[10px] text-slate-600" dir="ltr">{platform.slug}</p></div></header>
      <dl className="mt-5 grid flex-1 grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Input</dt><dd className="mt-1 font-bold">{platform.inputType.replaceAll("_", " ")}</dd></div><div><dt className="text-slate-500">Category</dt><dd className="mt-1 font-bold">{platform.category}</dd></div><div className="col-span-2"><dt className="text-slate-500">{copy.builder}</dt><dd className="mt-1 flex min-w-0 items-center gap-1 truncate font-mono font-bold" dir="ltr" title={platform.urlTemplate || copy.noBuilder}>{platform.urlTemplate ? <><ExternalLink className="shrink-0" size={13}/><span className="truncate">{platform.urlTemplate}</span></> : copy.noBuilder}</dd></div><div className="col-span-2"><dt className="text-slate-500">{copy.validation}</dt><dd className="mt-1 truncate font-mono font-bold" dir="ltr" title={platform.validationPattern || copy.noValidation}>{platform.validationPattern ? <><Check className="inline" size={13}/> {platform.validationPattern}</> : copy.noValidation}</dd></div><div><dt className="text-slate-500">{copy.appLinks}</dt><dd className="mt-1 flex gap-1 font-bold"><Smartphone size={13}/>{platform.androidAppUrl || platform.iosAppUrl ? "Android / iOS" : copy.none}</dd></div><div><dt className="text-slate-500">{copy.used}</dt><dd className="mt-1 flex gap-1 font-bold"><Users size={13}/>{platform.usageCount}</dd></div><div className="col-span-2"><dt className="text-slate-500">{copy.fallback}</dt><dd className="mt-1 truncate font-mono font-bold" dir="ltr" title={platform.webFallback || copy.none}>{platform.webFallback || copy.none}</dd></div></dl>
      <footer className="mt-5 flex gap-2 border-t border-white/10 pt-4"><button className="btn-secondary flex-1" onClick={() => setSelected(platform)}><Pencil size={15}/>{copy.edit}</button><form action={toggleLinkPlatform}><input type="hidden" name="id" value={platform.id}/><ConfirmSubmit className={platform.isActive ? "btn-danger" : "btn-secondary"} message={platform.isActive ? copy.disableConfirm : copy.enable}><Power size={15}/><span className="sr-only">{platform.isActive ? copy.disable : copy.enable}</span></ConfirmSubmit></form></footer>
    </article>)}</div>
    {selected !== undefined && <div className="fixed inset-0 z-50 grid items-end bg-slate-950/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="platform-dialog-title" onMouseDown={event => { if (event.currentTarget === event.target) setSelected(undefined); }}>
      <div className="max-h-[95dvh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[color:var(--app-surface)] p-5 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-7">
        <header className="mb-6 flex items-center justify-between gap-4"><div className="flex items-center gap-3">{selected ? <PlatformIcon platform={selected} size="large"/> : <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-300"><Plus size={24}/></span>}<div><p className="admin-eyebrow">Link platforms</p><h2 id="platform-dialog-title" className="text-xl">{selected ? `${copy.edit}: ${selected.nameEn}` : copy.add}</h2></div></div><button className="btn-secondary px-3" onClick={() => setSelected(undefined)} aria-label={copy.close}><X size={18}/></button></header>
        <PlatformForm platform={selected} copy={copy} onDone={() => setSelected(undefined)}/>
      </div>
    </div>}
  </>;
}

export function AddLinkPlatformButton({ copy }: { copy: Copy }) {
  const [open, setOpen] = useState(false);
  return <><button className="btn-primary" onClick={() => setOpen(true)}><Plus size={17}/>{copy.add}</button>{open&&<div className="fixed inset-0 z-50 grid items-end bg-slate-950/75 backdrop-blur-sm sm:place-items-center sm:p-5" role="dialog" aria-modal="true" onMouseDown={event=>{if(event.currentTarget===event.target)setOpen(false)}}><div className="max-h-[95dvh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[color:var(--app-surface)] p-5 sm:max-w-3xl sm:rounded-3xl sm:p-7"><header className="mb-6 flex justify-between"><div><p className="admin-eyebrow">Link platforms</p><h2 className="text-xl">{copy.add}</h2></div><button className="btn-secondary px-3" onClick={()=>setOpen(false)} aria-label={copy.close}><X size={18}/></button></header><PlatformForm platform={null} copy={copy} onDone={()=>setOpen(false)}/></div></div>}</>;
}
