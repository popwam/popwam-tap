import { DestinationType, prisma } from "@popwam/db";
import { getPermanentCardUrl } from "@popwam/shared";
import { createAdminUserDestination, setAdminCardDestination } from "@/app/business-actions";
import { updateDestination } from "@/app/actions";
import { Badge } from "@/components/badge";
import { DestinationIcon } from "@/components/destination-icon";
import { PageHeading } from "@/components/page-heading";
import { ProfileAvatar } from "@/components/profile-avatar";

export const metadata = { title: "Links by user | POPWAM Tap" };

export default async function AdminLinksByUserPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; user?: string }>;
}) {
  const { q = "", user: selectedUser = "" } = await searchParams;
  const query = q.trim();
  const users = await prisma.user.findMany({
    where: {
      ...(selectedUser ? { id: selectedUser } : {}),
      ...(query ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { destinations: { some: { title: { contains: query, mode: "insensitive" } } } },
          { ownedCards: { some: { publicSlug: { contains: query, mode: "insensitive" } } } },
          { ownedCards: { some: { batch: { is: { name: { contains: query, mode: "insensitive" } } } } } },
          { ownedCards: { some: { batch: { is: { productionBatch: { is: { batchCode: { contains: query, mode: "insensitive" } } } } } } } },
        ],
      } : {}),
    },
    include: {
      profiles: { include: { virtualCard: true }, orderBy: { createdAt: "asc" } },
      destinations: { orderBy: [{ profileId: "asc" }, { sortOrder: "asc" }] },
      ownedCards: { include: { activeDestination: true, batch: { include: { productionBatch: true } } }, orderBy: { createdAt: "desc" } },
      ownedTags: { include: { activeDestination: true }, orderBy: { createdAt: "desc" } },
      subscriptions: { where: { status: "ACTIVE" }, include: { plan: true }, orderBy: { startsAt: "desc" }, take: 1 },
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    take: 100,
  });

  return <>
    <PageHeading eyebrow="Administration" title="Links by user / الروابط حسب المستخدم" description="Every account is collapsed by default. Expanding it reveals only that user’s links and physical cards."/>
    <form className="card mb-5 flex flex-wrap gap-3 p-4" action="/admin/links">
      <input className="input min-w-64 flex-1" type="search" name="q" defaultValue={query} placeholder="Name, email, link title, short code, or batch code"/>
      <button className="btn-primary">Search / بحث</button>
    </form>
    <div className="space-y-4">
      {users.map(user => {
        const avatar = user.profiles.find(profile => profile.avatarUrl)?.avatarUrl || user.image;
        const plan = user.subscriptions[0]?.plan;
        return <details className="card overflow-hidden" key={user.id} data-testid="admin-user-accordion">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 p-5">
            <ProfileAvatar name={user.name} email={user.email} imageUrl={avatar} size={48}/>
            <div className="min-w-48 flex-1"><h2 className="font-bold">{user.name || user.email}</h2><p className="text-sm text-slate-500" dir="ltr">{user.email}</p></div>
            <Badge value={plan?.name || "Free"}/>
            <div className="grid grid-cols-3 gap-4 text-center text-xs text-slate-400"><span><strong className="block text-base text-white">{user.destinations.length}</strong>Links</span><span><strong className="block text-base text-white">{user.profiles.length}</strong>Virtual</span><span><strong className="block text-base text-white">{user.ownedCards.length + user.ownedTags.length}</strong>Physical</span></div>
          </summary>
          <div className="border-t border-white/10 p-5">
            <details className="rounded-xl border border-white/10 p-4">
              <summary className="cursor-pointer font-semibold">Create link / إنشاء رابط</summary>
              <form action={createAdminUserDestination} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input type="hidden" name="userId" value={user.id}/>
                <select className="input" name="profileId" required>{user.profiles.map(profile => <option value={profile.id} key={profile.id}>{profile.displayName}</option>)}</select>
                <input className="input" name="title" placeholder="Default title" required/>
                <input className="input" name="titleAr" placeholder="العنوان العربي"/>
                <input className="input" name="titleEn" placeholder="English title"/>
                <select className="input" name="type">{Object.values(DestinationType).map(type => <option key={type}>{type}</option>)}</select>
                <input className="input xl:col-span-2" name="url" placeholder="URL, email or phone" dir="ltr"/>
                <input className="input xl:col-span-3" name="customIconUrl" placeholder="Custom icon image URL (plan permitting)" dir="ltr"/>
                <button className="btn-primary">Create</button>
              </form>
            </details>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <section><h3 className="mb-3 font-bold">Links / الروابط</h3><div className="space-y-3">{user.destinations.map(destination => <details className="rounded-xl bg-white/[.04] p-4" key={destination.id}>
                <summary className="flex cursor-pointer list-none items-center gap-3"><DestinationIcon type={destination.type} iconKey={destination.iconKey}/><span className="min-w-0 flex-1"><strong className="block">{destination.title}</strong><span className="block truncate text-xs text-slate-500" dir="ltr">{destination.url}</span></span><Badge value={destination.isVisible ? "VISIBLE" : "HIDDEN"}/></summary>
                <form action={updateDestination} className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                  <input type="hidden" name="id" value={destination.id}/><input className="input" name="title" defaultValue={destination.title} required/><select className="input" name="type" defaultValue={destination.type}>{Object.values(DestinationType).map(type => <option key={type}>{type}</option>)}</select><input className="input" name="titleAr" defaultValue={destination.titleAr || ""}/><input className="input" name="titleEn" defaultValue={destination.titleEn || ""}/><input className="input sm:col-span-2" name="url" defaultValue={destination.url} dir="ltr"/><input className="input sm:col-span-2" name="customIconUrl" defaultValue={destination.customIconUrl || ""} placeholder="Custom icon URL" dir="ltr"/><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={destination.isActive}/>Active</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isVisible" defaultChecked={destination.isVisible}/>Visible</label><button className="btn-secondary sm:col-span-2">Save link</button>
                </form>
              </details>)}{!user.destinations.length && <p className="text-sm text-slate-500">No links.</p>}</div></section>

              <section><h3 className="mb-3 font-bold">Physical NFC cards / كروت NFC</h3><div className="space-y-3">{user.ownedCards.map(card => <div className="rounded-xl bg-white/[.04] p-4" key={card.id}>
                <div className="flex flex-wrap items-center justify-between gap-2"><span><strong className="font-mono">{card.serialNumber}</strong><a className="ms-3 text-xs text-brand-400" href={getPermanentCardUrl(card.publicSlug)} target="_blank">{card.publicSlug}</a></span><Badge value={card.inventoryStatus}/></div>
                <p className="mt-2 text-xs text-slate-500">Batch: {card.batch?.productionBatch?.batchCode || card.batch?.name || "—"} · Active: {card.activeDestination?.title || "Disabled until selected"}</p>
                <form action={setAdminCardDestination} className="mt-3 flex gap-2"><input type="hidden" name="cardId" value={card.id}/><select className="input" name="destinationId" defaultValue={card.activeDestinationId || ""} required><option value="">Choose destination</option>{user.destinations.filter(item => item.isActive).map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select><button className="btn-secondary">Set</button></form>
              </div>)}{!user.ownedCards.length && <p className="text-sm text-slate-500">No physical cards.</p>}</div></section>
            </div>
          </div>
        </details>;
      })}
      {!users.length && <p className="card p-6 text-slate-500">No matching users.</p>}
    </div>
  </>;
}
