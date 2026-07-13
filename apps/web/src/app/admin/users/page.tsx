import { prisma } from "@popwam/db";
import { createAdminUser } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/badge";
import { Plus } from "lucide-react";

export const metadata = { title: "Admin users" };

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ include: { _count: { select: { profiles: true, destinations: true, ownedTags: true } } }, orderBy: { createdAt: "desc" } });
  return <><PageHeading eyebrow="Administration" title="Users" description="Create accounts and review resource counts. Password hashes are never selected or rendered here."/>
    <details className="card mb-6 p-5"><summary className="flex cursor-pointer list-none items-center gap-2 font-bold"><Plus size={18} className="text-brand-400"/> Create user</summary><form action={createAdminUser} className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="label">Name</span><input className="input" name="name"/></label><label><span className="label">Email</span><input className="input" type="email" name="email" required/></label><label><span className="label">Password</span><input className="input" type="password" name="password" minLength={8} required/></label><label><span className="label">System role</span><select className="input" name="role"><option>USER</option><option>ADMIN</option></select></label><button className="btn-primary sm:col-span-2 sm:justify-self-start">Create account</button></form></details>
    <div className="card overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Profiles</th><th className="p-4">Destinations</th><th className="p-4">Tags</th><th className="p-4">Joined</th></tr></thead><tbody className="divide-y divide-white/10">{users.map(user => <tr key={user.id}><td className="p-4"><p className="font-semibold">{user.name || "—"}</p><p className="mt-1 text-xs text-slate-500">{user.email}</p></td><td className="p-4"><Badge value={user.role}/></td><td className="p-4">{user._count.profiles}</td><td className="p-4">{user._count.destinations}</td><td className="p-4">{user._count.ownedTags}</td><td className="p-4 text-xs text-slate-500">{user.createdAt.toLocaleDateString()}</td></tr>)}</tbody></table></div>
  </>;
}
