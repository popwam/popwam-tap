"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";

export function PasskeyEnrollmentPrompt({ locale }: { locale: "ar" | "en" }) {
  const router = useRouter(); const ar = locale === "ar"; const [pending, setPending] = useState(false); const [error, setError] = useState("");
  const add = async () => { setPending(true); setError(""); try { const options = await fetch("/api/passkeys/register/options", { method: "POST" }).then((response) => response.json()); const response = await startRegistration({ optionsJSON: options }); const result = await fetch("/api/passkeys/register/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(response) }); if (!result.ok) throw new Error(); void trackFirebaseAnalyticsEvent("passkey_enrollment_completed", { platform: "web", outcome: "success" }); router.push("/onboarding"); } catch { setPending(false); setError(ar ? "تعذر إعداد مفتاح المرور. يمكنك استخدام OTP في أي وقت." : "The passkey could not be created. You can use OTP at any time."); } };
  useEffect(() => { void trackFirebaseAnalyticsEvent("passkey_enrollment_shown", { platform: "web" }); }, []);
  return <section role="dialog" aria-modal="true" className="mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl sm:p-8" dir={ar ? "rtl" : "ltr"}><KeyRound className="text-brand-400" size={30}/><h1 className="mt-4 text-2xl font-black">{ar ? "أمّن حساب POP" : "Secure your POP account"}</h1><p className="mt-3 leading-7 text-slate-400">{ar ? "استخدم بصمة الوجه أو الإصبع أو أمان جهازك لتسجيل الدخول بسرعة في المرة القادمة." : "Use your face, fingerprint, or device security to sign in faster next time."}</p>{error && <p role="alert" className="mt-4 text-sm text-amber-300">{error}</p>}<button type="button" className="btn-primary mt-6 w-full py-3" disabled={pending} onClick={add}>{pending ? (ar ? "جارٍ الإعداد…" : "Setting up…") : (ar ? "إعداد مفتاح المرور" : "Set up passkey")}</button><button type="button" className="btn-secondary mt-3 w-full" onClick={() => router.push("/onboarding")}>{ar ? "ليس الآن" : "Not now"}</button></section>;
}
