import Link from "next/link";
import { AccountStatus, Prisma, prisma } from "@popwam/db";
import { AdminCreateUserForm } from "@/components/admin-create-user-form";
import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { getI18n } from "@/lib/i18n";
import { ArrowUpRight, Plus } from "lucide-react";

export const metadata = { title: "Admin users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; locale?: string }> }) {
  const { locale } = await getI18n();
  const filters = await searchParams;
  const q = filters.q?.trim().slice(0, 100) || "";
  const where: Prisma.UserWhereInput = {
    ...(Object.values(AccountStatus).includes(filters.status as AccountStatus) ? { status: filters.status as AccountStatus } : {}),
    ...(filters.locale ? { locale: { startsWith: filters.locale.slice(0, 8), mode: "insensitive" } } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phoneE164: { contains: q } }] } : {}),
  };
  const users = await prisma.user.findMany({
    where,
    include: {
      accounts: { select: { provider: true }, take: 1 },
      subscriptions: { where: { status: "ACTIVE" }, include: { plan: true }, take: 1 },
      _count: { select: { profiles: true, destinations: true, profileFields: true, uploads: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return <><PageHeading eyebrow="Administration" title="Users" description="Search safe account state, provider, locale, plan, resource usage, and direct management access."/>
    <details className="card mb-6 p-5"><summary className="flex cursor-pointer list-none items-center gap-2 font-bold"><Plus size={18} className="text-brand-400"/> Create user</summary><AdminCreateUserForm locale={locale}/></details>
    <form className="card mb-5 grid gap-3 p-4 md:grid-cols-5"><input className="input md:col-span-2" name="q" defaultValue={q} placeholder="Name, email, or verified phone"/><select className="input" name="status" defaultValue={filters.status || ""}><option value="">All statuses</option>{Object.values(AccountStatus).map(value => <option key={value}>{value}</option>)}</select><select className="input" name="locale" defaultValue={filters.locale || ""}><option value="">All locales</option><option value="en">English</option><option value="ar">Arabic</option><option value="fr">French</option></select><button className="btn-primary">Filter</button></form>
    <div className="card overflow-x-auto"><table className="w-full min-w-[1150px] text-start text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500"><tr>{["User","Role / status","Provider","Locale","Plan","Profiles","Links","Fields","Uploads","Created","Last login",""] .map(label => <th className="p-4" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-white/10">{users.map(user => <tr key={user.id}><td className="p-4"><p className="font-semibold">{user.name || "—"}</p><p className="mt-1 text-xs text-slate-500">{user.email}</p></td><td className="p-4"><div className="flex gap-1"><Badge value={user.role}/><Badge value={user.status}/></div></td><td className="p-4">{user.accounts[0]?.provider || (user.passwordHash ? "credentials" : "—")}</td><td className="p-4">{user.locale || "system"}</td><td className="p-4">{user.subscriptions[0]?.plan.name || "FREE"}</td><td className="p-4">{user._count.profiles}</td><td className="p-4">{user._count.destinations}</td><td className="p-4">{user._count.profileFields}</td><td className="p-4">{user._count.uploads}</td><td className="p-4 text-xs text-slate-500">{user.createdAt.toLocaleDateString(locale)}</td><td className="p-4 text-xs text-slate-500">{user.lastLoginAt?.toLocaleString(locale) || "—"}</td><td className="p-4"><Link href={`/admin/users/${user.id}`} className="btn-secondary">Manage <ArrowUpRight size={14}/></Link></td></tr>)}</tbody></table>{!users.length && <p className="p-6 text-slate-500">No users match these filters.</p>}</div>
  </>;
}
