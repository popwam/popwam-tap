import { prisma } from "@popwam/db";
import { CheckCircle2, CircleAlert, MessageSquareText } from "lucide-react";
import { AdminSmsTestForm } from "@/components/admin-sms-test-form";
import { PageHeading } from "@/components/page-heading";
import { getOtpTestModeSummary } from "@/lib/otp-test-mode";

export const metadata = { title: "SMS status" };
export const dynamic = "force-dynamic";

export default async function AdminSmsPage() {
  const provider = (process.env.SMS_PROVIDER || "development").toLowerCase();
  const testMode = getOtpTestModeSummary();
  const [last, successful, failed] = await Promise.all([
    prisma.otpSendLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, responseCode: true, messageId: true, cost: true } }),
    prisma.otpSendLog.count({ where: { status: "SENT" } }),
    prisma.otpSendLog.count({ where: { status: "FAILED" } }),
  ]);
  const configured = provider === "smsmisr"
    ? Boolean(process.env.SMSMISR_ENVIRONMENT && process.env.SMSMISR_USERNAME && process.env.SMSMISR_PASSWORD && process.env.SMSMISR_SENDER_TOKEN && process.env.SMSMISR_TEMPLATE_TOKEN && process.env.SMSMISR_BASE_URL)
    : Boolean(process.env.SMS_API_URL && process.env.SMS_API_TOKEN && process.env.SMS_SENDER_ID);
  const cards = [
    ["Provider", provider === "smsmisr" ? "SMS Misr" : provider],
    ["Environment", process.env.SMSMISR_ENVIRONMENT === "1" ? "Live" : process.env.SMSMISR_ENVIRONMENT === "2" ? "Test" : "—"],
    ["Configured", configured ? "نعم" : "لا"],
    ["Sender configured", process.env.SMSMISR_SENDER_TOKEN ? "نعم" : "لا"],
    ["Template configured", process.env.SMSMISR_TEMPLATE_TOKEN ? "نعم" : "لا"],
    ["آخر إرسال", last?.createdAt.toLocaleString("ar-EG") || "—"],
    ["آخر Response Code", last?.responseCode || "—"], ["آخر SMSID", last?.messageId || "—"],
    ["Cost", last?.cost || "—"], ["الرسائل الناجحة", String(successful)], ["الرسائل الفاشلة", String(failed)],
  ];
  const testCards = [
    ["Test mode enabled", testMode.enabled ? "نعم" : "لا"],
    ["Allowlisted test phones", String(testMode.allowlistedPhoneCount)],
    ["OTP exposed in staging", testMode.exposedInStaging ? "نعم" : "لا"],
  ];
  return <>
    <PageHeading eyebrow="Operations" title="حالة SMS" description="حالة الربط ونتائج الإرسال فقط، دون عرض بيانات الدخول أو التوكنات أو رموز OTP."/>
    {process.env.SMSMISR_ENVIRONMENT === "2" && <div className="mb-5 flex gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100"><CircleAlert className="shrink-0"/><p><strong>بيئة اختبار:</strong> Environment 2 ليست بيئة Live.</p></div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label,value])=><div className="card p-5" key={label}><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>{configured?<CheckCircle2 size={17} className="text-emerald-300"/>:<MessageSquareText size={17} className="text-slate-500"/>}</div><p className="mt-3 break-all font-semibold">{value}</p></div>)}</section>
    <section className="mt-6"><h2 className="mb-3 text-lg font-bold">وضع اختبار OTP المقيد</h2>{testMode.malformed&&<p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">إعداد قائمة الاختبار أو الكود الثابت غير صالح؛ وضع الاختبار معطل.</p>}<div className="grid gap-3 sm:grid-cols-3">{testCards.map(([label,value])=><div className="card p-5" key={label}><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-3 font-semibold">{value}</p></div>)}</div></section>
    <div className="mt-6"><AdminSmsTestForm/></div>
  </>;
}
