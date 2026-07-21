"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Phone, Shield } from "lucide-react";
import {PasskeyLogin} from "@/components/passkey-actions";

type Copy = { title:string;description:string;email:string;password:string;signIn:string;signingIn:string;invalid:string;or:string;google:string };
export function LoginForm({locale,copy}:{locale:"ar"|"en";copy:Copy}) {
  const ar=locale==="ar";
  const search=useSearchParams();
  const requested=search.get("callbackUrl")||"/dashboard";
  const callbackUrl=requested.startsWith("/")&&!requested.startsWith("//")?requested:"/dashboard";
  return <div className="card w-full max-w-md p-6 sm:p-8">
    <div className="mb-7"><div className="text-sm font-black"><span className="text-brand-400">POP</span> by POPWAM</div><h1 className="mt-4 text-2xl font-bold">{copy.title}</h1><p className="mt-2 text-sm leading-7 text-slate-400">{ar?"رقم الهاتف هو هوية حساب POP الأساسية. لا تحتاج إلى بريد إلكتروني أو كلمة مرور.":"Your phone number is your primary POP identity. No email or password is required."}</p></div>
    <PasskeyLogin locale={locale} callbackUrl={callbackUrl}/><Link className="btn-primary w-full py-3" href={`/login/phone?callbackUrl=${encodeURIComponent(callbackUrl)}`}><Phone size={18}/>{ar?"الدخول برقم الهاتف":"Continue with phone"}</Link>
    <div className="mt-6 border-t border-white/10 pt-5 text-center"><Link href="/admin/login" className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-brand-400"><Shield size={14}/>{ar?"دخول الإدارة":"Admin sign in"}</Link></div>
  </div>;
}
