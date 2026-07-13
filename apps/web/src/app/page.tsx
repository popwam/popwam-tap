import Link from "next/link";
import { ArrowRight, Nfc, QrCode, ShieldCheck } from "lucide-react";
import { getI18n } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function HomePage() {
  const { locale, dictionary: d } = await getI18n(); const h = d.home;
  const features = [[Nfc,h.featureToken,h.featureTokenText],[QrCode,h.featureQr,h.featureQrText],[ShieldCheck,h.featureSafe,h.featureSafeText]] as const;
  return <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8">
    <nav className="flex items-center justify-between gap-3"><Link href="/" className="text-lg font-black tracking-tight"><span className="text-brand-400">POPWAM</span> Tap</Link><div className="flex gap-2"><LocaleSwitcher locale={locale} label={d.common.language}/><Link href="/login" className="btn-secondary">{h.signIn}</Link></div></nav>
    <section className="flex flex-1 flex-col items-center justify-center py-20 text-center"><div className="mb-6 rounded-full border border-brand-400/20 bg-brand-400/10 px-4 py-1.5 text-xs font-bold tracking-[.12em] text-brand-400">{h.badge}</div><h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-[-.045em] sm:text-7xl">{h.title}<br/><span className="bg-gradient-to-r from-brand-400 to-cyan-300 bg-clip-text text-transparent">{h.titleAccent}</span></h1><p className="mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">{h.description}</p>
      <div className="mt-9 flex flex-wrap justify-center gap-3"><Link href="/login" className="btn-primary">{h.dashboard} <ArrowRight className="directional-icon" size={16}/></Link><Link href="/mamdouh" className="btn-secondary">{h.demo}</Link></div>
      <div className="mt-16 grid w-full max-w-4xl gap-4 text-start sm:grid-cols-3">{features.map(([Icon,title,description]) => <div className="card p-5" key={title}><Icon className="mb-4 text-brand-400" size={25}/><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></div>)}</div>
    </section>
  </main>;
}
