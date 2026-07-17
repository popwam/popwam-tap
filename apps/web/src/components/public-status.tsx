import Link from "next/link";
import { CircleOff, PauseCircle, SearchX, ShieldAlert } from "lucide-react";
import { getI18n } from "@/lib/i18n";

export async function PublicStatus({ type }: { type: "notFound" | "paused" | "lost" | "disabled" | "fallback" | "unavailable" }) {
  const { dictionary: d } = await getI18n();
  const copy = { notFound: [SearchX,d.status.notFoundTitle,d.status.notFoundText], paused: [PauseCircle,d.status.pausedTitle,d.status.pausedText], lost: [ShieldAlert,d.status.lostTitle,d.status.lostText], disabled: [CircleOff,d.status.disabledTitle,d.status.disabledText], fallback: [CircleOff,d.status.fallbackTitle,d.status.fallbackText], unavailable: [CircleOff,d.status.unavailableTitle,d.status.unavailableText] } as const;
  const [Icon,title,description] = copy[type]; return <main className="flex min-h-screen items-center justify-center px-5"><div className="card max-w-md p-8 text-center"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/5"><Icon className="text-brand-400"/></div><h1 className="mt-5 text-2xl font-black">{title}</h1><p className="mt-3 leading-7 text-slate-400">{description}</p><Link href="/" className="btn-secondary mt-7">POP by POPWAM</Link></div></main>;
}
