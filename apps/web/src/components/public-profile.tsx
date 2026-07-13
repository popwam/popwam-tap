import type { Profile } from "@popwam/db";
import { destinationIcons } from "@popwam/shared";
import { isSafeDestinationUrl, normalizeDestination } from "@/lib/url";
import { Download, MapPin } from "lucide-react";

function link(title: string, type: string, value?: string | null) {
  if (!value) return null;
  const url = normalizeDestination(type, value);
  if (!isSafeDestinationUrl(url)) return null;
  return { title, type, url };
}

export function PublicProfile({ profile }: { profile: Profile }) {
  const contacts = [
    link("WhatsApp Business", "WHATSAPP_BUSINESS", profile.whatsappBusiness),
    link("WhatsApp", "WHATSAPP_PRIVATE", profile.whatsappPrivate), link("Call", "PHONE", profile.phone),
    link("Email", "EMAIL", profile.email), link("Website", "WEBSITE", profile.website),
  ].filter(Boolean) as Array<{ title: string; type: keyof typeof destinationIcons; url: string }>;
  const socials = [link("Facebook", "FACEBOOK", profile.facebook), link("LinkedIn", "LINKEDIN", profile.linkedin), link("GitHub", "GITHUB", profile.github), link("TikTok", "TIKTOK", profile.tiktok)].filter(Boolean) as Array<{ title: string; type: keyof typeof destinationIcons; url: string }>;
  const vcf = link("Save contact", "VCF", profile.vcfUrl);
  return <main className="mx-auto min-h-screen max-w-xl pb-10 sm:py-10"><article className="overflow-hidden sm:card">
    <div className="h-48 bg-gradient-to-br from-brand-500/30 via-cyan-500/10 to-violet-500/20 sm:h-56">{profile.coverUrl && <img src={profile.coverUrl} alt="" className="size-full object-cover"/>}</div>
    <div className="relative px-5 pb-7 sm:px-8"><div className="-mt-14 flex size-28 items-center justify-center overflow-hidden rounded-3xl border-4 border-ink bg-panel text-3xl font-black text-brand-400">{profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.displayName} className="size-full object-cover"/> : profile.displayName.slice(0, 2).toUpperCase()}</div><h1 className="mt-5 text-3xl font-black tracking-tight">{profile.displayName}</h1>{profile.title && <p className="mt-2 text-brand-400">{profile.title}</p>}{profile.bio && <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-400">{profile.bio}</p>}{profile.locationText && <p className="mt-4 flex items-center gap-2 text-sm text-slate-400"><MapPin size={15}/>{profile.locationText}</p>}
      {vcf && <a href={vcf.url} className="btn-primary mt-6 w-full"><Download size={16}/> Save Contact / VCF</a>}
      {!!contacts.length && <section className="mt-7 grid grid-cols-2 gap-3">{contacts.map(item => <a href={item.url} key={item.title} className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[.04] p-3 text-center hover:bg-white/[.08]"><span className="text-xl">{destinationIcons[item.type]}</span><span className="mt-2 text-xs font-semibold">{item.title}</span></a>)}</section>}
      {!!socials.length && <section className="mt-7"><p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Find me online</p><div className="grid gap-2">{socials.map(item => <a href={item.url} target="_blank" rel="noreferrer" key={item.title} className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/5"><span>{destinationIcons[item.type]}</span>{item.title}</a>)}</div></section>}
    </div>
  </article><p className="mt-6 text-center text-xs text-slate-600">Powered by <span className="font-bold text-slate-400">POPWAM Tap</span></p></main>;
}
