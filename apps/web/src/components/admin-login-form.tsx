"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { LocaleSwitcher } from "./locale-switcher";

type Copy = {
  title: string; description: string; email: string; password: string;
  showPassword: string; hidePassword: string; signIn: string; signingIn: string;
  invalid: string; back: string; portal: string;
};

export function AdminLoginForm({ locale, copy, languageLabel }: { locale: "ar" | "en"; copy: Copy; languageLabel: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(search.get("error") ? copy.invalid : "");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError("");
    const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/admin" });
    setPending(false);
    if (!result?.ok) { setError(copy.invalid); return; }
    router.replace("/admin"); router.refresh();
  }

  return <div className="w-full max-w-md"><div className="mb-5 flex items-center justify-between"><Link href="/" className="text-xl font-black"><span className="text-brand-400">POPWAM</span> Tap</Link><LocaleSwitcher locale={locale} label={languageLabel}/></div><section className="card border-white/10 p-6 shadow-2xl shadow-black/30 sm:p-8"><div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400"><LockKeyhole/></div><p className="text-xs font-bold uppercase tracking-[.18em] text-brand-400" dir="ltr">{copy.portal}</p><h1 className="mt-2 text-3xl font-black">{copy.title}</h1><p className="mt-3 text-sm leading-7 text-slate-400">{copy.description}</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block"><span className="label">{copy.email}</span><input className="input" dir="ltr" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label className="block"><span className="label">{copy.password}</span><span className="relative block"><input className="input pe-12" dir="ltr" type={visible?"text":"password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/><button type="button" onClick={()=>setVisible(x=>!x)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={visible?copy.hidePassword:copy.showPassword}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>{error&&<p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}<button className="btn-primary w-full py-3" disabled={pending}>{pending?copy.signingIn:copy.signIn}</button></form><Link href="/login" className="mt-6 block text-center text-sm text-slate-400 hover:text-white">{copy.back}</Link></section></div>;
}
