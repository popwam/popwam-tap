"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";

type Category = { slug: string; nameEn: string; nameAr: string; descriptionEn?: string | null; descriptionAr?: string | null; defaultTemplateId?: string | null };
type Template = { id: string; nameEn: string; nameAr: string };

export function InitialProfileBootstrap({ locale }: { locale: "ar" | "en" }) {
  const router = useRouter(); const ar = locale === "ar";
  const [name, setName] = useState(""); const [kind, setKind] = useState<"PERSONAL" | "BUSINESS">("PERSONAL");
  const [categories, setCategories] = useState<Category[]>([]); const [categorySlug, setCategorySlug] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]); const [templateId, setTemplateId] = useState("");
  const [pending, setPending] = useState(false); const [error, setError] = useState("");
  useEffect(() => { void trackFirebaseAnalyticsEvent("profile_bootstrap_started", { platform: "web" }); }, []);
  useEffect(() => { setCategorySlug(""); setTemplateId(""); fetch(`/api/profile-categories?profileKind=${kind}`).then((response) => response.json()).then((result) => setCategories(result.categories || [])).catch(() => setCategories([])); }, [kind]);
  useEffect(() => { if (!categorySlug) { setTemplates([]); return; } fetch(`/api/profile-templates?profileKind=${kind}&categorySlug=${encodeURIComponent(categorySlug)}`).then((response) => response.json()).then((result) => { const next = result.templates || []; setTemplates(next); setTemplateId(result.defaultTemplateId || next[0]?.id || ""); }).catch(() => setTemplates([])); }, [kind, categorySlug]);
  const submit = async () => {
    setPending(true); setError("");
    const response = await fetch("/api/profile-bootstrap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale, displayName: name, profileKind: kind, categorySlug, templateId: templateId || null }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setPending(false); setError(result.error === "PROFILE_BOOTSTRAP_COMPATIBILITY_REQUIRED" ? (ar ? "يتطلب هذا الحساب ترقية توافقية خفيفة لاحقًا؛ لم نغير بياناتك الحالية." : "This account needs a later compatibility upgrade; your existing data was not changed.") : (ar ? "تعذر إعداد الملف. تحقق من الاختيارات وحاول مرة أخرى." : "We could not set up the profile. Check your choices and try again.")); return; }
    void trackFirebaseAnalyticsEvent("profile_bootstrap_completed", { platform: "web", profile_kind: kind, category_key: categorySlug, outcome: "success" });
    router.refresh();
  };
  return <section className="mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl sm:p-8" dir={ar ? "rtl" : "ltr"}>
    <p className="text-sm font-bold text-brand-400">{ar ? "الخطوة 1 من 3" : "Step 1 of 3"}</p><h1 className="mt-3 text-2xl font-black">{ar ? "ابدأ ملف POP الخاص بك" : "Start your POP profile"}</h1><p className="mt-2 text-sm leading-7 text-slate-400">{ar ? "اختر الأساسيات الآن. ستكمل التفاصيل لاحقًا." : "Choose the essentials now. You will complete details later."}</p>
    <label className="mt-6 block"><span className="label">{ar ? "الاسم" : "Name"}</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required/></label>
    <fieldset className="mt-5"><legend className="label">{ar ? "نوع الملف" : "Profile type"}</legend><div className="grid grid-cols-2 gap-3"><button type="button" className={kind === "PERSONAL" ? "btn-primary" : "btn-secondary"} onClick={() => { setKind("PERSONAL"); void trackFirebaseAnalyticsEvent("profile_kind_selected", { platform: "web", profile_kind: "PERSONAL" }); }}>{ar ? "شخصي" : "Personal"}</button><button type="button" className={kind === "BUSINESS" ? "btn-primary" : "btn-secondary"} onClick={() => { setKind("BUSINESS"); void trackFirebaseAnalyticsEvent("profile_kind_selected", { platform: "web", profile_kind: "BUSINESS" }); }}>{ar ? "أعمال" : "Business"}</button></div></fieldset>
    <label className="mt-5 block"><span className="label">{ar ? "الفئة" : "Category"}</span><select className="input" value={categorySlug} onChange={(event) => { setCategorySlug(event.target.value); if (event.target.value) void trackFirebaseAnalyticsEvent("profile_category_selected", { platform: "web", profile_kind: kind, category_key: event.target.value }); }}><option value="">{ar ? "اختر فئة" : "Choose a category"}</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{ar ? category.nameAr : category.nameEn}</option>)}</select></label>
    {templates.length > 1 && <label className="mt-5 block"><span className="label">{ar ? "القالب" : "Template"}</span><select className="input" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{templates.map((template) => <option key={template.id} value={template.id}>{ar ? template.nameAr : template.nameEn}</option>)}</select></label>}
    {error && <p role="alert" className="mt-4 text-sm text-amber-300">{error}</p>}
    <button type="button" className="btn-primary mt-6 w-full py-3" onClick={submit} disabled={pending || !name.trim() || !categorySlug}>{pending ? (ar ? "جارٍ الإعداد…" : "Setting up…") : (ar ? "متابعة" : "Continue")}</button>
  </section>;
}
