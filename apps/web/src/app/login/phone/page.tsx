import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { OtpForm } from "@/components/otp-form";

export default async function PhoneLoginPage({searchParams}:{searchParams:Promise<{callbackUrl?:string}>}) { if((await getServerSession(authOptions))?.user)redirect("/dashboard"); const [{locale},{callbackUrl="/dashboard"}]=await Promise.all([getI18n(),searchParams]); const ar=locale==="ar"; return <main className="landing-shell flex min-h-screen items-center justify-center px-4 py-10"><div className="w-full max-w-md"><Link href="/" className="mx-auto block w-fit text-xl font-black"><span className="text-brand-400">POPWAM</span> Tap</Link><div className="card mt-6 p-6 sm:p-8"><h1 className="text-2xl font-black">{ar?"تسجيل الدخول برقم الهاتف":"Sign in with phone"}</h1><p className="mt-2 text-sm leading-7 text-slate-400">{ar?"سنرسل رمزًا من 6 أرقام عبر SMS. لا تحتاج إلى كلمة مرور.":"We will send a 6-digit SMS code. No password is needed."}</p><div className="mt-6"><OtpForm purpose="LOGIN" locale={locale} callbackUrl={callbackUrl}/></div></div></div></main>; }
