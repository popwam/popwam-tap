import { PageHeading } from "@/components/page-heading";
import { getI18n } from "@/lib/i18n";

export default async function SettingsPage(){
  const {dictionary:d}=await getI18n();const copy=d.adminPages.settings;
  const values=[process.env.ALLOWED_IMAGE_TYPES||"image/jpeg,image/png,image/webp",`${process.env.MAX_IMAGE_UPLOAD_MB||5} MB`,process.env.ALLOWED_FILE_TYPES||"PDF, vCard, common images",`${process.env.MAX_FILE_UPLOAD_MB||10} MB`,process.env.R2_PUBLIC_BASE_URL?copy.configured:copy.notConfigured,process.env.NEXT_PUBLIC_APP_URL||copy.notConfigured];
  return <><PageHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description}/><div className="card max-w-3xl p-5"><dl className="grid gap-4 sm:grid-cols-2">{copy.labels.map((key,index)=><div className="rounded-xl bg-white/5 p-4" key={key}><dt className="text-xs text-slate-500">{key}</dt><dd className="mt-1 break-words text-sm font-semibold" dir={index===5?"ltr":undefined}>{values[index]}</dd></div>)}</dl></div></>;
}
