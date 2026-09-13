import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n";
import { getActivationClaim } from "@/lib/activation-session";

export const dynamic = "force-dynamic";

export default async function ActivationPhonePage({ params }: { params: Promise<{ publicSlug:string }> }) {
  const { publicSlug } = await params;
  const [claim, { locale }] = await Promise.all([getActivationClaim(), getI18n()]);
  if (!claim || claim.card.publicSlug !== publicSlug || claim.status !== "PENDING_OTP" || claim.expiresAt <= new Date()) {
    redirect(`/activate/card/${publicSlug}?error=session-expired`);
  }
  const ar = locale === "ar";
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-7">
        <p className="text-xs font-black text-brand-400">POP by POPWAM</p>
        <h1 className="mt-3 text-2xl font-black">{ar ? "التحقق الهاتفي قيد التحديث" : "Phone verification is being updated"}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {ar
            ? "التحقق الهاتفي لتفعيل الويب غير متاح حاليًا. استخدم تطبيق POP على Android."
            : "Phone verification for Web activation is currently unavailable. Use POP for Android."}
        </p>
      </div>
    </main>
  );
}
