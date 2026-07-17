"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { createPlatformDestination } from "@/app/catalog-actions";
import { buildPlatformUrl, platformOpenTarget } from "@/lib/link-platforms";

type Platform = { id:string;nameAr:string;nameEn:string;slug:string;inputType:string;placeholder:string;urlTemplate:string|null;validationPattern:string|null;androidAppUrl:string|null;iosAppUrl:string|null;webFallback:string|null;helpAr:string|null;helpEn:string|null;allowCustomLabel:boolean };
type Card = { id:string;name:string };

export function PlatformLinkCapture({ platforms, cards, locale }: { platforms:Platform[];cards:Card[];locale:"ar"|"en" }) {
  const [platformId, setPlatformId] = useState(platforms[0]?.id || "");
  const [value, setValue] = useState("");
  const platform = platforms.find(item => item.id === platformId);
  const preview = useMemo(() => platform ? buildPlatformUrl(platform, value) : null, [platform, value]);
  const ar = locale === "ar";
  const fallback = platform ? platformOpenTarget(platform, "web") : null;
  if (!platforms.length || !cards.length) return <p className="text-sm text-slate-500">{ar ? "أنشئ ملفاً افتراضياً أولاً وتأكد من تفعيل منصات الروابط." : "Create a virtual profile and configure at least one active platform first."}</p>;
  return <form action={createPlatformDestination} className="grid gap-4 sm:grid-cols-2">
    <label><span className="label">{ar ? "الملف الافتراضي" : "Virtual profile"}</span><select className="input" name="virtualCardId">{cards.map(card => <option value={card.id} key={card.id}>{card.name}</option>)}</select></label>
    <label><span className="label">{ar ? "المنصة" : "Platform"}</span><select className="input" name="linkPlatformId" value={platformId} onChange={event => { setPlatformId(event.target.value); setValue(""); }}>{platforms.map(item => <option value={item.id} key={item.id}>{ar ? item.nameAr : item.nameEn}</option>)}</select></label>
    <label className="sm:col-span-2"><span className="label">{ar ? "اسم المستخدم أو الرابط المنسوخ" : "Username or pasted profile link"}</span><input className="input" name="value" value={value} onChange={event => setValue(event.target.value)} placeholder={platform?.placeholder} dir="ltr" required/></label>
    {platform?.allowCustomLabel && <label className="sm:col-span-2"><span className="label">{ar ? "عنوان مخصص (اختياري)" : "Custom label (optional)"}</span><input className="input" name="customLabel"/></label>}
    <div className="rounded-xl bg-white/5 p-4 text-sm sm:col-span-2"><p className="leading-6 text-slate-300">{ar ? platform?.helpAr || "افتح ملفك في التطبيق، انسخ رابط الملف، ارجع إلى POP by POPWAM والصق الرابط هنا." : platform?.helpEn || "Open your profile in the platform, copy its profile link, return to POP by POPWAM, and paste it here."}</p><p className="mt-2 text-xs text-slate-500">{ar ? "لا نطلب كلمة مرور ولا يمكننا نسخ الرابط تلقائياً من تطبيق آخر." : "We never ask for a social password and cannot copy a link automatically from another app."}</p>{fallback && <a className="btn-secondary mt-3" href={fallback} target="_blank" rel="noreferrer"><ExternalLink size={15}/>{ar ? "فتح المنصة" : "Open platform"}</a>}</div>
    <div className={`rounded-xl border p-3 text-xs sm:col-span-2 ${preview?.valid ? "border-emerald-400/20 text-emerald-200" : "border-white/10 text-slate-500"}`} dir="ltr">{preview?.valid ? preview.url : (ar ? "ستظهر معاينة الرابط الصحيح هنا." : "A validated link preview will appear here.")}</div>
    <button className="btn-primary sm:col-span-2" disabled={!preview?.valid}><Plus size={16}/>{ar ? "إضافة رابط المنصة" : "Add platform link"}</button>
  </form>;
}
