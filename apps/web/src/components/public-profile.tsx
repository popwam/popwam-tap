import type { Prisma, ProfileFieldType } from "@popwam/db";
import { isSafeDestinationUrl, normalizeDestination } from "@/lib/url";
import { DestinationIcon } from "@/components/destination-icon";
import { Download, ExternalLink, FileText, MapPin } from "lucide-react";
import { getI18n } from "@/lib/i18n";

export type PublicProfileData = Prisma.ProfileGetPayload<{ include: { fields: true; uploads: true } }>;

function link(title: string, type: Parameters<typeof normalizeDestination>[0], value?: string | null) {
  if (!value) return null; const url = normalizeDestination(type, value);
  return isSafeDestinationUrl(url) ? { title, type, url } : null;
}

function fieldUrl(field: { type: ProfileFieldType; value: string; actionUrl: string | null }) {
  if (field.actionUrl) { const url = normalizeDestination(field.type, field.actionUrl); return isSafeDestinationUrl(url) ? url : null; }
  const mapping: Partial<Record<ProfileFieldType, string>> = { PHONE: "PHONE", EMAIL: "EMAIL", WHATSAPP: "WHATSAPP_PRIVATE", URL: "WEBSITE", FILE: "FILE", LOCATION: "LOCATION", SOCIAL: "SOCIAL" };
  const destinationType = mapping[field.type]; if (!destinationType) return null;
  const url = field.type === "LOCATION" && !/^https?:/i.test(field.value) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(field.value)}` : normalizeDestination(destinationType, field.value);
  return isSafeDestinationUrl(url) ? url : null;
}

export async function PublicProfile({ profile }: { profile: PublicProfileData }) {
  const { dictionary: d } = await getI18n();
  const contacts = [
    link("WhatsApp Business", "WHATSAPP_BUSINESS", profile.whatsappBusiness), link("WhatsApp", "WHATSAPP_PRIVATE", profile.whatsappPrivate),
    link("Call", "PHONE", profile.phone), link("Email", "EMAIL", profile.email), link("Website", "WEBSITE", profile.website),
  ].filter(Boolean) as Array<{ title: string; type: "WHATSAPP_BUSINESS" | "WHATSAPP_PRIVATE" | "PHONE" | "EMAIL" | "WEBSITE"; url: string }>;
  const socials = [link("Facebook", "FACEBOOK", profile.facebook), link("LinkedIn", "LINKEDIN", profile.linkedin), link("GitHub", "GITHUB", profile.github), link("TikTok", "TIKTOK", profile.tiktok)].filter(Boolean) as Array<{ title: string; type: "FACEBOOK" | "LINKEDIN" | "GITHUB" | "TIKTOK"; url: string }>;
  const vcf = link("Save contact", "VCF", profile.vcfUrl);
  return <main className={`public-theme theme-${profile.theme.toLowerCase()} mx-auto min-h-screen max-w-xl pb-10 sm:py-10`}><article className="profile-card overflow-hidden sm:rounded-[var(--profile-radius)]">
    <div className="h-48 bg-gradient-to-br from-brand-500/30 via-cyan-500/10 to-violet-500/20 sm:h-56">{profile.coverUrl && <img src={profile.coverUrl} alt="" className="size-full object-cover"/>}</div>
    <div className="relative px-5 pb-7 sm:px-8"><div className="profile-avatar -mt-14 flex size-28 items-center justify-center overflow-hidden rounded-3xl border-4 text-3xl font-black">{profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.displayName} className="size-full object-cover"/> : profile.displayName.slice(0, 2).toUpperCase()}</div><h1 className="mt-5 text-3xl font-black tracking-tight">{profile.displayName}</h1>{profile.title && <p className="profile-accent mt-2">{profile.title}</p>}{profile.bio && <p className="profile-muted mt-4 whitespace-pre-line text-sm leading-7">{profile.bio}</p>}{profile.locationText && <p className="profile-muted mt-4 flex items-center gap-2 text-sm"><MapPin size={15}/>{profile.locationText}</p>}
      {vcf && <a href={vcf.url} className="btn-primary mt-6 w-full"><Download size={16}/> {d.profile.saveContact}</a>}
      {!!contacts.length && <section className="mt-7 grid grid-cols-2 gap-3">{contacts.map(item => <a href={item.url} key={item.title} className="profile-item flex min-h-20 flex-col items-center justify-center rounded-2xl p-3 text-center"><DestinationIcon type={item.type}/><span className="mt-2 text-xs font-semibold">{item.title}</span></a>)}</section>}
      {!!socials.length && <section className="mt-7"><p className="profile-muted mb-3 text-xs font-bold uppercase tracking-widest">{d.profile.social}</p><div className="grid gap-2">{socials.map(item => <a href={item.url} target="_blank" rel="noreferrer" key={item.title} className="profile-item flex items-center gap-3 rounded-xl px-4 py-3 text-sm"><DestinationIcon type={item.type}/>{item.title}</a>)}</div></section>}
      {!!profile.fields.length && <section className="mt-7"><p className="profile-muted mb-3 text-xs font-bold uppercase tracking-widest">{d.profile.more}</p><div className="grid gap-2">{profile.fields.map(field => { const url = fieldUrl(field); const content = <><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black/10"><ExternalLink size={17}/></span><span className="min-w-0 flex-1"><strong className="block text-sm">{field.label}</strong><span className="profile-muted mt-0.5 block break-words text-xs">{field.value}</span></span></>; return url ? <a key={field.id} href={url} target={url.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="profile-item flex items-center gap-3 rounded-xl p-3">{content}</a> : <div key={field.id} className="profile-item flex items-center gap-3 rounded-xl p-3">{content}</div>; })}</div></section>}
      {!!profile.uploads.length && <section className="mt-7"><p className="profile-muted mb-3 text-xs font-bold uppercase tracking-widest">{d.profile.files}</p><div className="grid gap-2">{profile.uploads.map(file => <a href={file.publicUrl} target="_blank" rel="noreferrer" key={file.id} className="profile-item flex items-center gap-3 rounded-xl p-3"><FileText size={20}/><span className="min-w-0 flex-1 truncate text-sm font-semibold">{file.title || file.originalFilename}</span><Download size={16}/></a>)}</div></section>}
    </div>
  </article><p className="profile-muted mt-6 text-center text-xs">Powered by <span className="font-bold">POPWAM Tap</span></p></main>;
}
