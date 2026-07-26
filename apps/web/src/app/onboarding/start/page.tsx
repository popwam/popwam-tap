import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n";
import { getProfileBootstrapStatus } from "@/lib/profile-bootstrap";
import { bootstrapRoute } from "@/lib/entry-flow-policy";
import { LegalConsentSheet } from "@/components/legal-consent-sheet";
import { InitialProfileBootstrap } from "@/components/initial-profile-bootstrap";
import { PasskeyEnrollmentPrompt } from "@/components/passkey-enrollment-prompt";

export default async function InitialOnboardingPage() {
  const [user, { locale }] = await Promise.all([requireUser(), getI18n()]);
  const status = await getProfileBootstrapStatus(user.id, locale);
  const route = bootstrapRoute({ ...status, isNewUser: status.isNewAccount });
  if (route === "DASHBOARD") redirect("/dashboard");
  if (route === "LEGACY_COMPATIBILITY") return <main className="flex min-h-screen items-center justify-center px-5"><section className="card max-w-lg p-7"><h1 className="text-2xl font-black">{locale === "ar" ? "ملفك الحالي جاهز" : "Your existing profile is ready"}</h1><p className="mt-3 leading-7 text-slate-400">{locale === "ar" ? "لن نعيد ضبط بياناتك. ستتوفر ترقية توافقية خفيفة لاحقًا." : "We will not reset your data. A lightweight compatibility upgrade will be available later."}</p></section></main>;
  if (route === "LEGAL_UNAVAILABLE") return <main className="flex min-h-screen items-center justify-center px-5"><section className="card max-w-lg p-7"><h1 className="text-2xl font-black">{locale === "ar" ? "المستندات القانونية غير متاحة" : "Legal documents are unavailable"}</h1><p className="mt-3 leading-7 text-slate-400">{locale === "ar" ? "لا يمكن إكمال إعداد حساب جديد حتى تُنشر الإصدارات القانونية المطلوبة." : "A new account cannot be completed until the required legal versions are published."}</p></section></main>;
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-8">{route === "LEGAL_CONSENT" ? <LegalConsentSheet locale={locale} documents={status.requiredDocuments.map((document) => ({ ...document, path: document.documentType === "PRIVACY" ? "/privacy" : "/terms" }))}/> : route === "PROFILE_BOOTSTRAP" ? <InitialProfileBootstrap locale={locale}/> : <PasskeyEnrollmentPrompt locale={locale}/>}</main>;
}
