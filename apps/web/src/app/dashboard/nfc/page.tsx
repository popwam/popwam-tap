import { prisma } from "@popwam/db";
import { getPermanentCardUrl } from "@popwam/shared";
import { NfcPlatformActions } from "@/components/nfc-platform-actions";
import { PageHeading } from "@/components/page-heading";
import { QrCard } from "@/components/qr-card";
import { requireUser } from "@/lib/session";

export default async function NfcToolsPage() {
  const user = await requireUser();
  const cards = await prisma.card.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" } });
  return <><PageHeading eyebrow="NFC tools" title="Write, verify and share" description="The permanent public URL is written to NFC. Activation codes are never written. iPhone writing requires the native Core NFC app."/><div className="space-y-4">{cards.map(card => { const url = getPermanentCardUrl(card.publicSlug); return <section className="card grid gap-5 p-5 lg:grid-cols-[120px_1fr]" key={card.id}><QrCard value={url} name={card.serialNumber} compact/><div><h2 className="font-mono font-bold" dir="ltr">{card.serialNumber}</h2><p className="my-3 break-all text-xs text-slate-500" dir="ltr">{url}</p><NfcPlatformActions cardId={card.id} permanentUrl={url}/></div></section>; })}{!cards.length && <p className="card p-6 text-slate-500">No assigned physical cards.</p>}</div></>;
}
