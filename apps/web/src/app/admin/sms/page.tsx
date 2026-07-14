import { prisma } from "@popwam/db";
import { CheckCircle2, CircleAlert, MessageSquareText } from "lucide-react";
import { AdminSmsTestForm } from "@/components/admin-sms-test-form";
import { PageHeading } from "@/components/page-heading";
import { getOtpTestModeSummary } from "@/lib/otp-test-mode";
import { getI18n } from "@/lib/i18n";

export const metadata={title:"SMS status"};
export const dynamic="force-dynamic";

export default async function AdminSmsPage(){
  const provider=(process.env.SMS_PROVIDER||"development").toLowerCase();const testMode=getOtpTestModeSummary();
  const [{locale,dictionary:d},last,successful,failed]=await Promise.all([getI18n(),prisma.otpSendLog.findFirst({orderBy:{createdAt:"desc"},select:{createdAt:true,responseCode:true,messageId:true,cost:true}}),prisma.otpSendLog.count({where:{status:"SENT"}}),prisma.otpSendLog.count({where:{status:"FAILED"}})]);
  const configured=provider==="smsmisr"?Boolean(process.env.SMSMISR_ENVIRONMENT&&process.env.SMSMISR_USERNAME&&process.env.SMSMISR_PASSWORD&&process.env.SMSMISR_SENDER_TOKEN&&process.env.SMSMISR_TEMPLATE_TOKEN&&process.env.SMSMISR_BASE_URL):Boolean(process.env.SMS_API_URL&&process.env.SMS_API_TOKEN&&process.env.SMS_SENDER_ID);
  const copy=d.adminPages.sms;const common=d.adminPages.common;const yesNo=(value:boolean)=>value?common.yes:common.no;const unavailable=common.notAvailable;
  const values=[provider==="smsmisr"?"SMS Misr":provider,process.env.SMSMISR_ENVIRONMENT==="1"?common.live:process.env.SMSMISR_ENVIRONMENT==="2"?common.test:unavailable,yesNo(configured),yesNo(Boolean(process.env.SMSMISR_SENDER_TOKEN)),yesNo(Boolean(process.env.SMSMISR_TEMPLATE_TOKEN)),last?.createdAt.toLocaleString(locale==="ar"?"ar-EG":"en-US")||unavailable,last?.responseCode||unavailable,last?.messageId||unavailable,last?.cost||unavailable,String(successful),String(failed)];
  const testValues=[yesNo(testMode.enabled),String(testMode.allowlistedPhoneCount),yesNo(testMode.exposedInStaging)];
  return <><PageHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description}/>{process.env.SMSMISR_ENVIRONMENT==="2"&&<div className="mb-5 flex gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100"><CircleAlert className="shrink-0"/><p>{copy.testWarning}</p></div>}<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{copy.labels.map((label,index)=><div className="card p-5" key={label}><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>{configured?<CheckCircle2 size={17} className="text-emerald-300"/>:<MessageSquareText size={17} className="text-slate-500"/>}</div><p className="mt-3 break-all font-semibold" dir={index===7?"ltr":undefined}>{values[index]}</p></div>)}</section><section className="mt-6"><h2 className="mb-3 text-lg font-bold">{copy.testTitle}</h2>{testMode.malformed&&<p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{copy.malformed}</p>}<div className="grid gap-3 sm:grid-cols-3">{copy.testLabels.map((label,index)=><div className="card p-5" key={label}><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-3 font-semibold">{testValues[index]}</p></div>)}</div></section><div className="mt-6"><AdminSmsTestForm copy={copy}/></div></>;
}
