import { prisma } from "@popwam/db";
import { destinationIcons } from "@popwam/shared";
import { PageHeading } from "@/components/page-heading";

export const metadata = { title: "Admin resources" };

export default async function AdminResourcesPage() {
  const [profiles, destinations] = await Promise.all([
    prisma.profile.findMany({ include: { user: { select: { email: true } }, _count: { select: { tags: true, destinations: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.destination.findMany({ include: { user: { select: { email: true } }, profile: { select: { displayName: true } } }, orderBy: { updatedAt: "desc" } }),
  ]);
  return <>
    <PageHeading eyebrow="Administration" title="Profiles & destination cards" description="Read-only global inventory. User-owned changes still go through ownership-checked dashboard actions."/>
    <section className="card overflow-x-auto"><div className="border-b border-white/10 p-5"><h2 className="font-bold">All profiles <span className="text-slate-500">({profiles.length})</span></h2></div><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Profile</th><th className="p-4">Owner</th><th className="p-4">Visibility</th><th className="p-4">Destinations</th><th className="p-4">Tags</th></tr></thead><tbody className="divide-y divide-white/10">{profiles.map(profile => <tr key={profile.id}><td className="p-4"><p className="font-semibold">{profile.displayName}</p><p className="text-xs text-slate-500">{profile.slug ? `/p/${profile.slug}` : `/p/id/${profile.id}`}</p></td><td className="p-4 text-slate-400">{profile.user.email}</td><td className="p-4">{profile.isPublic ? "Public" : "Private"}</td><td className="p-4">{profile._count.destinations}</td><td className="p-4">{profile._count.tags}</td></tr>)}</tbody></table></section>
    <section className="card mt-6 overflow-x-auto"><div className="border-b border-white/10 p-5"><h2 className="font-bold">All destination cards <span className="text-slate-500">({destinations.length})</span></h2></div><table className="w-full min-w-[800px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Destination</th><th className="p-4">Owner</th><th className="p-4">Profile</th><th className="p-4">Type</th><th className="p-4">URL</th></tr></thead><tbody className="divide-y divide-white/10">{destinations.map(destination => <tr key={destination.id}><td className="p-4 font-semibold">{destination.icon || destinationIcons[destination.type]} {destination.title}</td><td className="p-4 text-slate-400">{destination.user.email}</td><td className="p-4 text-slate-400">{destination.profile?.displayName || "—"}</td><td className="p-4 text-xs">{destination.type.replaceAll("_", " ")}</td><td className="max-w-sm truncate p-4 text-xs text-slate-500">{destination.url}</td></tr>)}</tbody></table></section>
  </>;
}
