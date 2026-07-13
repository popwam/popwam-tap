import { DestinationType, prisma } from "@popwam/db";
import { destinationIcons } from "@popwam/shared";
import { requireUser } from "@/lib/session";
import { createDestination, deleteDestination, updateDestination } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

export const metadata = { title: "Destinations" };

function DestinationFields({ item }: { item?: { title: string; type: DestinationType; url: string; icon: string | null; isOfflineCapable: boolean } }) {
  return <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Title</span><input className="input" name="title" required defaultValue={item?.title}/></label><label><span className="label">Type</span><select className="input" name="type" defaultValue={item?.type || "WEBSITE"}>{Object.values(DestinationType).map(type => <option key={type}>{type}</option>)}</select></label><label className="sm:col-span-2"><span className="label">Destination</span><input className="input" name="url" required defaultValue={item?.url} placeholder="Website, email, phone, or safe URL"/></label><label><span className="label">Custom icon (optional)</span><input className="input" name="icon" defaultValue={item?.icon || ""}/></label><label className="flex items-end gap-2 pb-2 text-sm text-slate-300"><input type="checkbox" name="isOfflineCapable" defaultChecked={item?.isOfflineCapable} className="size-4 accent-brand-400"/> Offline-capable metadata</label></div>;
}

export default async function CardsPage() {
  const user = await requireUser();
  const destinations = await prisma.destination.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  return <>
    <PageHeading eyebrow="Routing" title="Destinations" description="Create safe destinations for your cards. Phone numbers, email, WhatsApp, and bare websites are normalized automatically."/>
    <details className="card mb-6 p-5"><summary className="flex cursor-pointer list-none items-center gap-2 font-bold"><Plus size={18} className="text-brand-400"/> New destination</summary><form action={createDestination} className="mt-5"><DestinationFields/><button className="btn-primary mt-5">Create destination</button></form></details>
    <div className="grid gap-4 xl:grid-cols-2">{destinations.map(item => <details className="card p-5" key={item.id}><summary className="flex cursor-pointer list-none items-center gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg">{item.icon || destinationIcons[item.type]}</div><div className="min-w-0 flex-1"><h2 className="font-bold">{item.title}</h2><p className="truncate text-xs text-slate-500">{item.url}</p></div><ExternalLink size={16} className="text-slate-600"/></summary><form action={updateDestination} className="mt-5 border-t border-white/10 pt-5"><input type="hidden" name="id" value={item.id}/><DestinationFields item={item}/><button className="btn-primary mt-5">Save changes</button></form><form action={deleteDestination} className="mt-3"><input type="hidden" name="id" value={item.id}/><button className="btn-danger"><Trash2 size={14}/> Delete</button></form></details>)}</div>
    {!destinations.length && <div className="card p-10 text-center text-sm text-slate-400">No destinations yet. Create the first one above.</div>}
  </>;
}
