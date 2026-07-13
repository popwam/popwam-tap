import Link from "next/link";
import { prisma } from "@popwam/db";
import { getLegacyTagUrl, getTagUrl } from "@popwam/shared";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n";
import { getUserEntitlements, getUserUsage } from "@/lib/plans";
import { updateOwnedTag } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/badge";
import { QrCard } from "@/components/qr-card";
import { CopyUrl } from "@/components/copy-url";
import { ArrowRight, ExternalLink } from "lucide-react";

export default async function TagsPage() {
  const user = await requireUser(); const { dictionary: d } = await getI18n();
  const [tags,destinations,{ effective },usage] = await Promise.all([
    prisma.tag.findMany({ where: { ownerId: user.id }, include: { activeDestination: true }, orderBy: { createdAt: "desc" } }),
    prisma.destination.findMany({ where: { userId: user.id, isActive: true }, orderBy: { title: "asc" } }), getUserEntitlements(user.id), getUserUsage(user.id),
  ]);
  return <><PageHeading eyebrow="NFC + QR" title={d.nav.tags} description="Every physical card has an independent record, analytics history, permanent token, short URL, status, and selected destination."/><p className="mb-5 text-sm text-slate-400">Tags: <strong className="text-white">{usage.tags} / {effective.maxTags}</strong></p><div className="space-y-5">{tags.map(tag => {
    const url = getTagUrl(tag.shortCode);
    return <article className="card p-5 sm:p-6" key={tag.id}><div className="grid gap-6 lg:grid-cols-[140px_1fr]"><QrCard value={url} name={tag.name} compact/><div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{tag.name}</h2><div className="mt-2 flex flex-wrap gap-2"><Badge value={tag.status}/><span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs text-brand-400">{d.tag.currentOpens}: {tag.activeDestination?.title || d.tag.unconfigured}</span></div></div><Link href={`/dashboard/tags/${tag.id}`} className="btn-secondary">Details <ArrowRight className="directional-icon" size={15}/></Link></div><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-slate-500">Scans:</span> {tag.scanCount}</p><p><span className="text-slate-500">Last scan:</span> {tag.lastScannedAt?.toLocaleString() || d.common.never}</p></div><div className="mt-4 flex items-center gap-2 rounded-xl bg-black/25 p-3 text-xs text-slate-400"><code className="min-w-0 flex-1 truncate" dir="ltr">{url}</code><CopyUrl value={url}/><a href={url} target="_blank" aria-label={d.common.test}><ExternalLink size={15}/></a></div><p className="mt-2 text-xs text-slate-600" dir="ltr">{d.tag.legacy}: {getLegacyTagUrl(tag.token)}</p><form action={updateOwnedTag} className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3"><input type="hidden" name="id" value={tag.id}/><label><span className="label">{d.tag.selectDestination}</span><select className="input" name="activeDestinationId" defaultValue={tag.activeDestinationId || ""}><option value="">{d.tag.unconfigured}</option>{destinations.map(destination => <option key={destination.id} value={destination.id}>{destination.title} · {destination.type}</option>)}</select></label><label><span className="label">Status</span><select className="input" name="status" defaultValue={tag.status}><option>ACTIVE</option><option>PAUSED</option><option>LOST</option></select></label><button className="btn-primary self-end sm:justify-self-start">{d.common.save}</button></form></div></div></article>;
  })}</div>{!tags.length && <div className="card p-10 text-center text-sm text-slate-400">No tags are assigned to you yet.</div>}</>;
}
