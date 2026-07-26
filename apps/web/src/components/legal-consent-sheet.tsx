"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";

type Document = { id: string; documentType: "TERMS" | "PRIVACY"; version: string; path: string };

export function LegalConsentSheet({ locale, documents }: { locale: "ar" | "en"; documents: Document[] }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const ar = locale === "ar";
  const submit = async () => {
    setPending(true); setError("");
    const response = await fetch("/api/legal/required", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accepted, locale }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setPending(false); setError(result.error === "LEGAL_DOCUMENTS_UNAVAILABLE" ? (ar ? "مستندات الشروط المطلوبة غير متاحة بعد." : "Required legal documents are not available yet.") : (ar ? "تعذر حفظ موافقتك." : "Your acceptance could not be saved.")); return; }
    void trackFirebaseAnalyticsEvent("legal_consent_completed", { platform: "web", outcome: "success" });
    router.refresh();
  };
  return <section role="dialog" aria-modal="true" aria-labelledby="legal-title" className="mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl sm:p-8" dir={ar ? "rtl" : "ltr"}>
    <ShieldCheck className="text-brand-400" size={30}/><h1 id="legal-title" className="mt-4 text-2xl font-black">{ar ? "قبل البدء" : "Before you begin"}</h1><p className="mt-2 leading-7 text-slate-400">{ar ? "راجع المستندات المطلوبة ووافق عليها للمتابعة إلى ملف POP الأول." : "Review and accept the required documents to continue to your first POP profile."}</p>
    <div className="mt-5 space-y-3">{documents.map((document) => <div className="rounded-2xl bg-white/5 p-4" key={document.id}><Link className="font-semibold text-brand-400 hover:underline" href={document.path}>{document.documentType === "TERMS" ? (ar ? "الشروط" : "Terms") : (ar ? "سياسة الخصوصية" : "Privacy Policy")}</Link><p className="mt-1 text-xs text-slate-500">{ar ? "الإصدار" : "Version"} {document.version}</p></div>)}</div>
    <label className="mt-5 flex gap-3 rounded-2xl border border-white/10 p-4 text-sm"><input className="mt-1" type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)}/><span>{ar ? "أوافق على الشروط وسياسة الخصوصية المطلوبة أعلاه." : "I accept the required Terms and Privacy Policy above."}</span></label>
    {error && <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p>}
    <button type="button" className="btn-primary mt-5 w-full py-3" disabled={!accepted || pending} onClick={submit}>{pending ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "موافقة ومتابعة" : "Accept and continue")}</button>
  </section>;
}
