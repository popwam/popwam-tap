import Link from "next/link";
import { ArrowRight, Nfc, QrCode, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8">
      <nav className="flex items-center justify-between">
        <Link href="/" className="text-lg font-black tracking-tight"><span className="text-brand-400">POPWAM</span> Tap</Link>
        <Link href="/login" className="btn-secondary">Sign in</Link>
      </nav>
      <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 rounded-full border border-brand-400/20 bg-brand-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[.2em] text-brand-400">Smart identity, one tap away</div>
        <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-[-.045em] sm:text-7xl">One permanent tap.<br/><span className="bg-gradient-to-r from-brand-400 to-cyan-300 bg-clip-text text-transparent">Infinite possibilities.</span></h1>
        <p className="mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">Your NFC card stores only a secure token URL. Change profiles, destinations, and safety status anytime—without rewriting the sticker.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="btn-primary">Open dashboard <ArrowRight size={16}/></Link>
          <Link href="/t/mamdouh" className="btn-secondary">View demo card</Link>
        </div>
        <div className="mt-16 grid w-full max-w-4xl gap-4 text-left sm:grid-cols-3">
          {[
            [Nfc, "Fixed smart token", "No private contact data is ever written to the NFC tag."],
            [QrCode, "NFC + QR", "The same managed token works across physical and printed media."],
            [ShieldCheck, "Safe by design", "Pause, mark lost, or disable a card from the dashboard."],
          ].map(([Icon, title, text]) => <div className="card p-5" key={String(title)}><Icon className="mb-4 text-brand-400" size={25}/><h2 className="font-bold">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{String(text)}</p></div>)}
        </div>
      </section>
    </main>
  );
}
