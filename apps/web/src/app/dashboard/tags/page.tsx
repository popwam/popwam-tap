import Link from "next/link";
import { prisma } from "@popwam/db";
import { getTagUrl } from "@popwam/shared";
import { requireUser } from "@/lib/session";
import { updateOwnedTag } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/badge";
import { QrCard } from "@/components/qr-card";
import { CopyUrl } from "@/components/copy-url";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Smart tags" };

export default async function TagsPage() {
  const user = await requireUser();
  const [tags, destinations] = await Promise.all([
    prisma.tag.findMany({ where: { ownerId: user.id }, include: { activeDestination: true }, orderBy: { createdAt: "desc" } }),
    prisma.destination.findMany({ where: { userId: user.id }, orderBy: { title: "asc" } }),
  ]);
  return <>
    <PageHeading eyebrow="NFC + QR" title="Smart tags" description="Every physical sticker stores only its permanent token URL. These controls change behavior instantly."/>
    <div className="space-y-5">{tags.map(tag => {
      const url = getTagUrl(tag.token);
      return <article className="card p-5 sm:p-6" key={tag.id}>
        <div className="grid gap-6 lg:grid-cols-[120px_1fr]">
          <QrCard value={url} name={tag.name} compact/>
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-bold">{tag.name}</h2><div className="mt-2 flex flex-wrap gap-2"><Badge value={tag.status}/><Badge value={tag.mode}/></div></div>
              <Link href={`/dashboard/tags/${tag.id}`} className="btn-secondary">Details <ArrowRight size={15}/></Link>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-black/25 p-3 text-xs text-slate-400"><code className="min-w-0 flex-1 truncate">{url}</code><CopyUrl value={url}/></div>
            <div className="mt-4 text-sm text-slate-400"><strong className="text-white">{tag.scanCount}</strong> scans · Destination: {tag.activeDestination?.title || "None"}</div>
            <form action={updateOwnedTag} className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
              <input type="hidden" name="id" value={tag.id}/>
              <label><span className="label">Mode</span><select className="input" name="mode" defaultValue={tag.mode}><option>PROFILE</option><option>REDIRECT</option></select></label>
              <label><span className="label">Status</span><select className="input" name="status" defaultValue={tag.status}><option>ACTIVE</option><option>PAUSED</option><option>LOST</option></select></label>
              <label><span className="label">Active destination</span><select className="input" name="activeDestinationId" defaultValue={tag.activeDestinationId || ""}><option value="">Safe fallback</option>{destinations.map(destination => <option key={destination.id} value={destination.id}>{destination.title}</option>)}</select></label>
              <button className="btn-primary sm:col-span-3 sm:justify-self-start">Apply controls</button>
            </form>
          </div>
        </div>
      </article>;
    })}</div>
    {!tags.length && <div className="card p-10 text-center text-sm text-slate-400">No tags are assigned to you yet. An admin can create and assign one.</div>}
  </>;
}
