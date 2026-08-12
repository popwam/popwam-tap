import Link from "next/link";
import { Prisma, ProfileAccess, ProfileKind, ProfileLifecycle, prisma } from "@popwam/db";
import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { requireAdmin } from "@/lib/session";

export default async function AdminProfilesPage({ searchParams }: { searchParams: Promise<{ q?: string; lifecycle?: string; access?: string; type?: string }> }) {
  await requireAdmin();
  const filters = await searchParams;
  const q = filters.q?.trim().slice(0, 100) || "";
  const where: Prisma.ProfileWhereInput = {
    ...(Object.values(ProfileLifecycle).includes(filters.lifecycle as ProfileLifecycle) ? { lifecycle: filters.lifecycle as ProfileLifecycle } : {}),
    ...(Object.values(ProfileAccess).includes(filters.access as ProfileAccess) ? { access: filters.access as ProfileAccess } : {}),
    ...(Object.values(ProfileKind).includes(filters.type as ProfileKind) ? { profileKind: filters.type as ProfileKind } : {}),
    ...(q ? { OR: [
      { displayName: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ] } : {}),
  };
  const profiles = await prisma.profile.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: {
      id: true, displayName: true, slug: true, profileKind: true, type: true, lifecycle: true, access: true,
      draftRevision: true, publishedAt: true, updatedAt: true, isPrimary: true,
      user: { select: { id: true, email: true, name: true, status: true } },
      category: { select: { slug: true, nameEn: true, nameAr: true } },
      publication: { select: { publishedRevision: { select: { sourceDraftRevision: true } } } },
      verificationCases: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      _count: { select: { destinations: true, mediaAssets: true, sectionEntries: true, services: true, branches: true } },
    },
  });
  return <><PageHeading eyebrow="Identity operations" title="Profiles" description="Search and inspect authoritative profile lifecycle, visibility, publication, verification, readiness and shareability without exposing private evidence."/>
    <form className="card mb-5 grid gap-3 p-4 md:grid-cols-6"><input className="input md:col-span-2" name="q" defaultValue={q} placeholder="Name, slug, or owner email"/><select className="input" name="type" defaultValue={filters.type || ""}><option value="">All profile types</option>{Object.values(ProfileKind).map(value => <option key={value}>{value}</option>)}</select><select className="input" name="lifecycle" defaultValue={filters.lifecycle || ""}><option value="">All lifecycle states</option>{Object.values(ProfileLifecycle).map(value => <option key={value}>{value}</option>)}</select><select className="input" name="access" defaultValue={filters.access || ""}><option value="">All visibility</option>{Object.values(ProfileAccess).map(value => <option key={value}>{value}</option>)}</select><button className="btn-primary">Filter</button></form>
    <div className="card overflow-x-auto"><table className="w-full min-w-[1300px] text-sm"><thead><tr>{["Profile","Owner","Type / category","Lifecycle","Visibility","Publication","Verification","Content","Shareability","Updated"].map(label => <th className="p-3 text-start" key={label}>{label}</th>)}</tr></thead><tbody>{profiles.map(profile => {
      const publicationRevision = profile.publication?.publishedRevision.sourceDraftRevision;
      const publishedCurrent = publicationRevision != null && publicationRevision === profile.draftRevision;
      const shareable = profile.lifecycle === "PUBLISHED" && profile.access !== "PRIVATE" && Boolean(profile.slug) && Boolean(profile.publication);
      return <tr className="border-t border-white/10 align-top" key={profile.id}><td className="p-3"><b>{profile.displayName}</b>{profile.isPrimary && <span className="ms-2 text-xs text-brand-400">Primary</span>}<p className="text-xs text-slate-500" dir="ltr">{profile.slug ? `pop.popwam.com/${profile.slug}` : "No public slug"}</p></td><td className="p-3"><Link className="text-brand-400" href={`/admin/users/${profile.user.id}`}>{profile.user.name || profile.user.email}</Link><p className="text-xs text-slate-500">{profile.user.status}</p></td><td className="p-3">{profile.profileKind || profile.type}<p className="text-xs text-slate-500">{profile.category?.nameEn || profile.category?.slug || "Legacy / uncategorized"}</p></td><td className="p-3"><Badge value={profile.lifecycle}/></td><td className="p-3"><Badge value={profile.access}/></td><td className="p-3"><Badge value={!profile.publication ? "NOT_PUBLISHED" : publishedCurrent ? "CURRENT" : "CHANGES_PENDING"}/><p className="mt-1 text-xs text-slate-500">Draft r{profile.draftRevision}{publicationRevision == null ? "" : ` · public r${publicationRevision}`}</p></td><td className="p-3"><Badge value={profile.verificationCases[0]?.status || "UNVERIFIED"}/></td><td className="p-3 text-xs text-slate-400">{profile._count.destinations} links · {profile._count.mediaAssets} media<br/>{profile._count.sectionEntries} structured · {profile._count.services} services · {profile._count.branches} locations</td><td className="p-3"><Badge value={shareable ? "SHAREABLE" : "BLOCKED"}/></td><td className="p-3 text-xs text-slate-500">{profile.updatedAt.toLocaleString()}</td></tr>;
    })}</tbody></table>{!profiles.length && <p className="p-6 text-slate-500">No profiles match these filters.</p>}</div>
  </>;
}
