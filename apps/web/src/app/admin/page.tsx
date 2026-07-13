import Link from "next/link";
import { prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { ArrowUpRight, MousePointer2, Nfc, Users } from "lucide-react";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const [users, tags, activeTags, scans] = await Promise.all([
    prisma.user.count(), prisma.tag.count(), prisma.tag.count({ where: { status: "ACTIVE" } }), prisma.tag.aggregate({ _sum: { scanCount: true } }),
  ]);
  const stats = [["Users", users, Users], ["All tags", tags, Nfc], ["Active tags", activeTags, Nfc], ["Total scans", scans._sum.scanCount || 0, MousePointer2]] as const;
  return <><PageHeading eyebrow="System administration" title="Admin overview" description="Global visibility and control for POPWAM Tap resources."/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, Icon]) => <div className="card p-5" key={label}><Icon size={20} className="text-brand-400"/><p className="mt-5 text-3xl font-black">{value}</p><p className="mt-1 text-sm text-slate-400">{label}</p></div>)}</div><div className="mt-6 grid gap-4 sm:grid-cols-3"><Link href="/admin/users" className="card flex items-center justify-between p-5 font-bold hover:bg-white/[.07]">Manage users <ArrowUpRight size={18}/></Link><Link href="/admin/tags" className="card flex items-center justify-between p-5 font-bold hover:bg-white/[.07]">Manage all tags <ArrowUpRight size={18}/></Link><Link href="/admin/resources" className="card flex items-center justify-between p-5 font-bold hover:bg-white/[.07]">Profiles & cards <ArrowUpRight size={18}/></Link></div></>;
}
