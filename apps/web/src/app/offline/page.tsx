import { WifiOff } from "lucide-react";
import { getI18n } from "@/lib/i18n";

export default async function OfflinePage() { const { dictionary } = await getI18n(); return <main className="flex min-h-screen items-center justify-center px-5"><div className="card max-w-md p-8 text-center"><WifiOff className="mx-auto text-brand-400" size={40}/><h1 className="mt-5 text-2xl font-black">{dictionary.pwa.offlineTitle}</h1><p className="mt-3 leading-7 text-slate-400">{dictionary.pwa.offlineText}</p></div></main>; }
