"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { PasskeyLogin } from "./passkey-actions";

const copy = {
  en: { slogan: "Your world. One POP.", how: "How it works", step1: "Enter your phone", step2: "Verify your number", step3: "Build your POP profile", step4: "Share with a link, QR, or supported NFC product", privacy: "Privacy Policy", terms: "Terms" },
  ar: { slogan: "عالمك. POP واحد.", how: "كيف يعمل POP؟", step1: "أدخل رقم هاتفك", step2: "تحقق من رقمك", step3: "أنشئ ملف POP الخاص بك", step4: "شارك عبر رابط أو QR أو منتجات NFC المدعومة", privacy: "الخصوصية", terms: "الشروط" },
} as const;

export function PhoneEntryScreen({ locale, callbackUrl }: { locale: "ar" | "en"; callbackUrl: string }) {
  const [howOpen, setHowOpen] = useState(false);
  const t = copy[locale];
  useEffect(() => {
    const key = "pop.entry.how-it-works.seen";
    if (!localStorage.getItem(key)) { setHowOpen(true); localStorage.setItem(key, "1"); }
  }, []);
  return <main className="flex min-h-screen flex-col px-5 py-8 sm:px-8" dir={locale === "ar" ? "rtl" : "ltr"}>
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
      <div className="mb-8 text-center"><div aria-label="POP" className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-400 text-lg font-black text-slate-950 shadow-lg shadow-brand-400/20"><Sparkles size={25}/></div><p className="mt-4 text-3xl font-black tracking-tight">POP</p><p className="mt-2 text-base text-slate-400">{t.slogan}</p></div>
      <PasskeyLogin locale={locale} callbackUrl={callbackUrl}/>
      <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
        {locale==="ar"
          ?"تسجيل الدخول بالهاتف على الويب متوقف مؤقتًا حتى اكتمال ربط Firebase الآمن بالجلسة. استخدم تطبيق POP على Android أو مفتاح المرور الحالي."
          :"Web phone sign-in is temporarily gated until Firebase verification is joined safely to the Web session. Use the POP Android app or an existing passkey."}
      </div>
      <div className="mt-6 border-t border-white/10 pt-4"><button type="button" onClick={() => setHowOpen((value) => !value)} aria-expanded={howOpen} className="flex w-full items-center justify-between py-2 text-sm font-semibold text-slate-200"><span>{t.how}</span>{howOpen ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>{howOpen && <ol className="mt-2 space-y-2 rounded-2xl bg-white/5 p-4 text-sm text-slate-400"><li>1. {t.step1}</li><li>2. {t.step2}</li><li>3. {t.step3}</li><li>4. {t.step4}</li></ol>}</div>
    </div>
    <footer className="mx-auto flex w-full max-w-md items-center justify-center gap-2 pt-6 text-xs text-slate-500"><Link href="/privacy" className="hover:text-brand-400">{t.privacy}</Link><span>·</span><Link href="/terms" className="hover:text-brand-400">{t.terms}</Link></footer>
  </main>;
}
