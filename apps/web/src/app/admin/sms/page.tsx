import { CheckCircle2, CircleAlert } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

export const metadata = { title: "Phone authentication" };
export const dynamic = "force-dynamic";

export default function AdminPhoneAuthPage() {
  const adminConfigured = Boolean(
    process.env.FCM_PROJECT_ID &&
    process.env.FCM_CLIENT_EMAIL &&
    process.env.FCM_PRIVATE_KEY,
  );
  return (
    <>
      <PageHeading
        eyebrow="Security"
        title="Firebase Phone Authentication"
        description="Firebase verifies phone ownership. POP resolves the canonical PostgreSQL user and issues the normal POP session."
      />
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Firebase Admin verification</p>
            {adminConfigured ? <CheckCircle2 size={18} className="text-emerald-300"/> : <CircleAlert size={18} className="text-amber-300"/>}
          </div>
          <p className="mt-3 font-semibold">{adminConfigured ? "Server credentials configured" : "Server credentials incomplete"}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Provider authority</p>
          <p className="mt-3 font-semibold">Firebase verifies; POP authorizes</p>
        </div>
      </section>
      <p className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
        Phone enablement, Android signing fingerprints, SMS region policy, quota, and billing remain Firebase Console checks.
      </p>
    </>
  );
}
