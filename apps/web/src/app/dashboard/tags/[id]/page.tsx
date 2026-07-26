import { notFound } from "next/navigation";
import { prisma } from "@popwam/db";
import { getPermanentCardUrl, getTagUrl } from "@popwam/shared";
import { updateOwnedTag } from "@/app/actions";
import { updateOwnedCard } from "@/app/business-actions";
import { Badge } from "@/components/badge";
import { CopyUrl } from "@/components/copy-url";
import { NfcPlatformActions } from "@/components/nfc-platform-actions";
import { PageHeading } from "@/components/page-heading";
import { ProductLostButton } from "@/components/product-lost-button";
import { QrCard } from "@/components/qr-card";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { locale, dictionary } = await getI18n();
  const securityCopy = dictionary.settingsCenter;
  const [card, destinations] = await Promise.all([
    prisma.card.findFirst({ where: { id, ownerId: user.id }, include: { activeDestination: true, dailyOpens: { orderBy: { date: "desc" }, take: 90 } } }),
    prisma.destination.findMany({ where: { userId: user.id, isActive: true }, orderBy: { title: "asc" } }),
  ]);
  if (card) {
    const url = getPermanentCardUrl(card.publicSlug);
    const mutable = card.cardStatus === "ACTIVE" || card.cardStatus === "PAUSED";
    return <>
      <PageHeading eyebrow="Card detail" title={card.serialNumber} description="Permanent card identity and selected destination." action={<div className="flex gap-2"><Badge value={card.assignmentStatus}/><Badge value={card.cardStatus}/></div>}/>
      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <section className="card p-6">
          <QrCard value={url} name={card.serialNumber}/>
          <div className="mt-5 flex gap-2 rounded-xl bg-black/30 p-3 text-xs"><code className="min-w-0 flex-1 break-all" dir="ltr">{url}</code><CopyUrl value={url}/></div>
          <dl className="mt-5 grid gap-3 text-sm"><div><dt className="text-slate-500">Open count</dt><dd>{card.openCount}</dd></div><div><dt className="text-slate-500">Last opened</dt><dd>{card.lastOpenedAt?.toLocaleString() || "Never"}</dd></div></dl>
        </section>
        <section className="space-y-5">
          {mutable && <form action={updateOwnedCard} className="card grid gap-4 p-5 sm:grid-cols-2">
            <input type="hidden" name="cardId" value={card.id}/>
            <label><span className="label">Status</span><select className="input" name="cardStatus" defaultValue={card.cardStatus}><option>ACTIVE</option><option>PAUSED</option></select></label>
            <label><span className="label">Active destination</span><select className="input" name="activeDestinationId" defaultValue={card.activeDestinationId || ""}><option value="">Not configured</option>{destinations.map(item => <option value={item.id} key={item.id}>{item.title} · {item.type}</option>)}</select></label>
            <button className="btn-primary sm:col-span-2">Save</button>
          </form>}
          {mutable && <section className="card p-5">
            <h2 className="font-bold">{securityCopy.reportProductLost}</h2>
            <ProductLostButton cardId={card.id} locale={locale} stepUpCopy={securityCopy.stepUp} label={securityCopy.reportProductLost} confirmText={securityCopy.confirmProductLost} successText={securityCopy.productMarkedLost} failureText={securityCopy.productLostFailed}/>
          </section>}
          <section className="card p-5"><h2 className="mb-4 font-bold">NFC, QR & sharing</h2><NfcPlatformActions cardId={card.id} permanentUrl={url}/></section>
          <section className="card p-5"><h2 className="font-bold">Daily opens</h2><div className="mt-3 grid gap-2">{card.dailyOpens.map(item => <div className="flex justify-between rounded-xl bg-white/5 p-3" key={item.id}><time>{item.date.toLocaleDateString()}</time><strong>{item.openCount}</strong></div>)}{!card.dailyOpens.length && <p className="text-slate-500">No opens.</p>}</div></section>
        </section>
      </div>
    </>;
  }

  const tag = await prisma.tag.findFirst({ where: { id, ownerId: user.id }, include: { activeDestination: true, events: { orderBy: { createdAt: "desc" }, take: 100 } } });
  if (!tag) notFound();
  const url = getTagUrl(tag.shortCode);
  return <>
    <PageHeading eyebrow="Legacy card" title={tag.name} description="Legacy compatibility record." action={<Badge value={tag.status}/>}/>
    <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
      <section className="card p-6"><QrCard value={url} name={tag.name}/><p className="mt-4 break-all font-mono text-xs" dir="ltr">{url}</p></section>
      <section className="space-y-5">
        <form action={updateOwnedTag} className="card grid gap-4 p-5 sm:grid-cols-2"><input type="hidden" name="id" value={tag.id}/><select className="input" name="status" defaultValue={tag.status}><option>ACTIVE</option><option>PAUSED</option></select><select className="input" name="activeDestinationId" defaultValue={tag.activeDestinationId || ""}><option value="">Not configured</option>{destinations.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select><button className="btn-primary sm:col-span-2">Save</button></form>
        <div className="card p-5"><h2 className="font-bold">Administrative history</h2>{tag.events.map(item => <div className="mt-2 flex justify-between border-t border-white/10 pt-2" key={item.id}><Badge value={item.type}/><time>{item.createdAt.toLocaleString()}</time></div>)}</div>
      </section>
    </div>
  </>;
}
