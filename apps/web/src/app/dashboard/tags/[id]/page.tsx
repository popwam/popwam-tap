import { notFound } from "next/navigation";
import { prisma } from "@popwam/db";
import { getTagUrl } from "@popwam/shared";
import { requireUser } from "@/lib/session";
import { updateOwnedTag } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/badge";
import { QrCard } from "@/components/qr-card";

export default async function TagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params;
  const [tag, destinations] = await Promise.all([
    prisma.tag.findFirst({ where: { id, ownerId: user.id }, include: { activeDestination: true, profile: true, events: { orderBy: { createdAt: "desc" }, take: 50 } } }),
    prisma.destination.findMany({ where: { userId: user.id }, orderBy: { title: "asc" } }),
  ]);
  if (!tag) notFound();
  const url = getTagUrl(tag.token);
  return <><PageHeading eyebrow="Tag detail" title={tag.name} description="Scan activity, permanent URL, and live behavior controls."/>
    <div className="grid gap-5 xl:grid-cols-[320px_1fr]"><section className="card p-6"><QrCard value={url} name={tag.name}/><div className="mt-5 break-all rounded-xl bg-black/30 p-3 text-xs text-slate-400">{url}</div><div className="mt-4 flex gap-2"><Badge value={tag.status}/><Badge value={tag.mode}/></div></section><section className="space-y-5"><div className="card grid gap-4 p-5 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Scans</p><p className="mt-2 text-2xl font-black">{tag.scanCount}</p></div><div><p className="text-xs text-slate-500">Last scanned</p><p className="mt-2 text-sm font-semibold">{tag.lastScannedAt?.toLocaleString() || "Never"}</p></div><div><p className="text-xs text-slate-500">Profile</p><p className="mt-2 text-sm font-semibold">{tag.profile?.displayName || "None"}</p></div></div><form action={updateOwnedTag} className="card grid gap-4 p-5 sm:grid-cols-3"><input type="hidden" name="id" value={tag.id}/><label><span className="label">Mode</span><select className="input" name="mode" defaultValue={tag.mode}><option>PROFILE</option><option>REDIRECT</option></select></label><label><span className="label">Status</span><select className="input" name="status" defaultValue={tag.status}><option>ACTIVE</option><option>PAUSED</option><option>LOST</option></select></label><label><span className="label">Destination</span><select className="input" name="activeDestinationId" defaultValue={tag.activeDestinationId || ""}><option value="">Safe fallback</option>{destinations.map(d => <option value={d.id} key={d.id}>{d.title}</option>)}</select></label><button className="btn-primary sm:col-span-3 sm:justify-self-start">Save controls</button></form><div className="card p-5"><h2 className="font-bold">Recent events</h2><div className="mt-4 divide-y divide-white/10">{tag.events.map(event => <div className="flex items-center justify-between gap-4 py-3 text-sm" key={event.id}><Badge value={event.type}/><time className="text-xs text-slate-500">{event.createdAt.toLocaleString()}</time></div>)}{!tag.events.length && <p className="py-5 text-sm text-slate-500">No events yet.</p>}</div></div></section></div>
  </>;
}
