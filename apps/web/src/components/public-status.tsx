import Link from "next/link";
import { CircleOff, PauseCircle, SearchX, ShieldAlert } from "lucide-react";

const copy = {
  notFound: [SearchX, "Smart card not found", "This token is unknown or may have been entered incorrectly."],
  paused: [PauseCircle, "Card paused", "This smart card is currently paused."],
  lost: [ShieldAlert, "Card marked as lost", "This smart card has been marked as lost by its owner."],
  disabled: [CircleOff, "Card unavailable", "This smart card is no longer active."],
  fallback: [CircleOff, "Nothing to open yet", "This smart card does not have a valid destination configured."],
  unavailable: [CircleOff, "Profile unavailable", "This public profile is currently unavailable."],
} as const;

export function PublicStatus({ type }: { type: keyof typeof copy }) {
  const [Icon, title, description] = copy[type];
  return <main className="flex min-h-screen items-center justify-center px-5"><div className="card max-w-md p-8 text-center"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/5"><Icon className="text-brand-400"/></div><h1 className="mt-5 text-2xl font-black">{title}</h1><p className="mt-3 leading-7 text-slate-400">{description}</p><Link href="/" className="btn-secondary mt-7">POPWAM Tap</Link></div></main>;
}
