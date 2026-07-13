import Link from "next/link";
import { prisma } from "@popwam/db";
import { requireUser } from "@/lib/session";
import { PageHeading } from "@/components/page-heading";
import { Activity, ArrowUpRight, CreditCard, MousePointer2, Nfc, UserRound } from "lucide-react";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [tagCount, activeTags, scans, destinationCount, profile] = await Promise.all([
    prisma.tag.count({ where: { ownerId: user.id } }),
    prisma.tag.count({ where: { ownerId: user.id, status: "ACTIVE" } }),
    prisma.tag.aggregate({ where: { ownerId: user.id }, _sum: { scanCount: true } }),
    prisma.destination.count({ where: { userId: user.id } }),
    prisma.profile.findFirst({ where: { userId: user.id, organizationId: null } }),
  ]);
  const stats = [
    ["Total tags", tagCount, Nfc, "text-cyan-300"], ["Active tags", activeTags, Activity, "text-emerald-300"],
    ["Total scans", scans._sum.scanCount || 0, MousePointer2, "text-violet-300"], ["Destinations", destinationCount, CreditCard, "text-amber-300"],
  ] as const;
  return <>
    <PageHeading eyebrow="Personal workspace" title={`Hello${user.name ? `, ${user.name.split(" ")[0]}` : ""}`} description="A live view of your smart cards, profiles, and engagement."/>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, Icon, color]) => <div className="card p-5" key={label}><div className="flex items-center justify-between"><p className="text-sm text-slate-400">{label}</p><Icon size={20} className={color}/></div><p className="mt-5 text-3xl font-black">{value}</p></div>)}</section>
    <section className="mt-7 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="card p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Default profile</p><h2 className="mt-3 text-xl font-bold">{profile?.displayName || "Create your profile"}</h2><p className="mt-1 text-sm text-slate-400">{profile?.title || "Add a title, bio, and contact methods."}</p></div><UserRound className="text-brand-400"/></div><div className="mt-8 flex flex-wrap gap-3"><Link href="/dashboard/profile" className="btn-primary">Edit profile <ArrowUpRight size={15}/></Link>{profile?.slug && <Link href={`/p/${profile.slug}`} target="_blank" className="btn-secondary">View public page</Link>}</div></div>
      <div className="card p-6"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Quick actions</p><div className="mt-4 grid gap-2"><Link href="/dashboard/cards" className="flex items-center justify-between rounded-xl border border-white/10 p-3.5 text-sm hover:bg-white/5">Add a destination <ArrowUpRight size={15}/></Link><Link href="/dashboard/tags" className="flex items-center justify-between rounded-xl border border-white/10 p-3.5 text-sm hover:bg-white/5">Manage smart tags <ArrowUpRight size={15}/></Link></div></div>
    </section>
  </>;
}
