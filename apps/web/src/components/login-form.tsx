"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone } from "lucide-react";

type Copy = { title: string; description: string; email: string; password: string; signIn: string; signingIn: string; invalid: string; or: string; google: string };

export function LoginForm({ googleEnabled, locale, copy }: { googleEnabled: boolean; locale: "ar" | "en"; copy: Copy }) {
  const ar = locale === "ar";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const requestedCallback = search.get("callbackUrl") || "/dashboard";
  const callbackUrl = requestedCallback.startsWith("/") && !requestedCallback.startsWith("//") ? requestedCallback : "/dashboard";
  const oauthError = search.get("error");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirect: false, callbackUrl });
    setPending(false);
    if (result?.error) setError(copy.invalid);
    else { router.push(result?.url || callbackUrl); router.refresh(); }
  }

  const friendlyOauthError = oauthError
    ? (ar ? "تعذر تسجيل الدخول عبر Google. لم يتم ربط أي حساب تلقائياً؛ حاول مجدداً أو استخدم رقم الهاتف." : "Google sign-in could not be completed. No account was linked automatically; try again or use your phone number.")
    : "";

  return <div className="card w-full max-w-md p-6 sm:p-8">
    <div className="mb-7">
      <div className="text-sm font-black"><span className="text-brand-400">POPWAM</span> Tap</div>
      <h1 className="mt-4 text-2xl font-bold">{copy.title}</h1>
      <p className="mt-2 text-sm text-slate-400">{ar ? "رقم الهاتف هو طريقة الدخول الأساسية والآمنة." : "Phone number is the primary, secure sign-in method."}</p>
    </div>
    {(friendlyOauthError || error) && <p className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{friendlyOauthError || error}</p>}
    <Link className="btn-primary w-full" href={`/login/phone?callbackUrl=${encodeURIComponent(callbackUrl)}`}><Phone size={18}/>{ar ? "الدخول برقم الهاتف" : "Sign in with phone"}</Link>
    {googleEnabled && <>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-600"><span className="h-px flex-1 bg-white/10"/>{copy.or}<span className="h-px flex-1 bg-white/10"/></div>
      <button onClick={() => signIn("google", { callbackUrl })} className="btn-secondary w-full">{copy.google}</button>
      <p className="mt-2 text-xs text-slate-500">{ar ? "Google اختياري، ولا يدمج الحسابات إلا من خلال ربط صريح وآمن." : "Google is optional. Accounts are never merged without an explicit, secure linking flow."}</p>
    </>}
    <details className="mt-6 rounded-xl border border-white/10 p-4">
      <summary className="cursor-pointer text-sm font-bold text-slate-300">{ar ? "دخول الإدارة القديم" : "Legacy administrator sign-in"}</summary>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <label><span className="label">{copy.email}</span><input className="input" name="email" type="email" autoComplete="email" dir="ltr" required/></label>
        <label><span className="label">{copy.password}</span><input className="input" name="password" type="password" autoComplete="current-password" dir="ltr" required/></label>
        <button className="btn-secondary w-full" disabled={pending}>{pending ? copy.signingIn : copy.signIn}</button>
      </form>
    </details>
  </div>;
}
