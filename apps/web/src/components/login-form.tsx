"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Phone } from "lucide-react";

type Copy = { title:string;description:string;email:string;password:string;signIn:string;signingIn:string;invalid:string;or:string;google:string };
export function LoginForm({googleEnabled,locale,copy}:{googleEnabled:boolean;locale:"ar"|"en";copy:Copy}) {
  const ar=locale==="ar";const search=useSearchParams();const requested=search.get("callbackUrl")||"/dashboard";const callbackUrl=requested.startsWith("/")&&!requested.startsWith("//")?requested:"/dashboard";const oauthError=search.get("error");
  return <div className="card w-full max-w-md p-6 sm:p-8"><div className="mb-7"><div className="text-sm font-black"><span className="text-brand-400">POPWAM</span> Tap</div><h1 className="mt-4 text-2xl font-bold">{ar?"مرحبًا بعودتك":"Welcome back"}</h1><p className="mt-2 text-sm leading-7 text-slate-400">{ar?"رقم الهاتف هو طريقة الدخول الأساسية والآمنة. لا تحتاج إلى كلمة مرور.":"Phone OTP is the primary secure sign-in method. No password is required."}</p></div>{oauthError&&<p className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{ar?"تعذر تسجيل الدخول عبر Google. استخدم رقم الهاتف أو حاول مجددًا.":"Google sign-in failed. Use your phone or try again."}</p>}<Link className="btn-primary w-full py-3" href={`/login/phone?callbackUrl=${encodeURIComponent(callbackUrl)}`}><Phone size={18}/>{ar?"الدخول برقم الهاتف":"Sign in with phone"}</Link>{googleEnabled&&<><div className="my-5 flex items-center gap-3 text-xs text-slate-600"><span className="h-px flex-1 bg-white/10"/>{copy.or}<span className="h-px flex-1 bg-white/10"/></div><button onClick={()=>signIn("google",{callbackUrl})} className="btn-secondary w-full">{copy.google}</button><p className="mt-3 text-xs leading-6 text-slate-500">{ar?"Google خيار إضافي وليس مسار الدخول الأساسي.":"Google is optional and is not the primary sign-in route."}</p></>}</div>;
}
