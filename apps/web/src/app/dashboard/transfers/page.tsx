import { prisma } from "@popwam/db";
import { cancelTagTransfer, requestTagTransfer, respondToTagTransfer } from "@/app/transfer-actions";
import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/session";

export default async function TransfersPage() {
  const user = await requireUser();
  await prisma.tagTransfer.updateMany({ where: { status: "PENDING", expiresAt: { lte: new Date() }, OR: [{ fromUserId: user.id }, { toUserId: user.id }, { invitedEmail: user.email.toLowerCase() }] }, data: { status: "EXPIRED" } });
  const [cards, outgoing, incoming] = await Promise.all([
    prisma.card.findMany({ where: { ownerId: user.id }, select: { id: true, serialNumber: true, publicSlug: true }, orderBy: { createdAt: "desc" } }),
    prisma.tagTransfer.findMany({ where: { fromUserId: user.id }, include: { tag: { select: { serialNumber: true } }, toUser: { select: { email: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.tagTransfer.findMany({ where: { OR: [{ toUserId: user.id }, { invitedEmail: user.email.toLowerCase() }] }, include: { tag: { select: { serialNumber: true } }, fromUser: { select: { email: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return <><PageHeading eyebrow="Ownership" title="Tag transfers / نقل ملكية الكروت" description="Ownership remains with the sender until the recipient explicitly accepts. Accepted cards pause until a new destination is selected."/>
    <form action={requestTagTransfer} className="card mb-6 grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto]"><select className="input" name="cardId" required><option value="">Choose physical card</option>{cards.map(card => <option value={card.id} key={card.id}>{card.serialNumber} · {card.publicSlug}</option>)}</select><input className="input" type="email" name="email" placeholder="Recipient verified email" required/><button className="btn-primary">Request transfer</button></form>
    <div className="grid gap-5 xl:grid-cols-2"><section className="card p-5"><h2 className="font-bold">Incoming / واردة</h2><div className="mt-4 space-y-3">{incoming.map(item => <div className="rounded-xl bg-white/5 p-4" key={item.id}><div className="flex justify-between gap-3"><span><strong>{item.tag.serialNumber}</strong><p className="text-xs text-slate-500" dir="ltr">{item.fromUser.email}</p></span><Badge value={item.status}/></div>{item.status === "PENDING" && <div className="mt-3 flex gap-2"><form action={respondToTagTransfer}><input type="hidden" name="transferId" value={item.id}/><input type="hidden" name="response" value="accept"/><button className="btn-primary">Accept</button></form><form action={respondToTagTransfer}><input type="hidden" name="transferId" value={item.id}/><input type="hidden" name="response" value="reject"/><button className="btn-secondary">Reject</button></form></div>}</div>)}{!incoming.length && <p className="text-sm text-slate-500">No incoming transfers.</p>}</div></section>
      <section className="card p-5"><h2 className="font-bold">Outgoing / صادرة</h2><div className="mt-4 space-y-3">{outgoing.map(item => <div className="rounded-xl bg-white/5 p-4" key={item.id}><div className="flex justify-between gap-3"><span><strong>{item.tag.serialNumber}</strong><p className="text-xs text-slate-500" dir="ltr">{item.toUser?.email || item.invitedEmail}</p></span><Badge value={item.status}/></div>{item.status === "PENDING" && <form action={cancelTagTransfer} className="mt-3"><input type="hidden" name="transferId" value={item.id}/><button className="btn-secondary">Cancel</button></form>}</div>)}{!outgoing.length && <p className="text-sm text-slate-500">No outgoing transfers.</p>}</div></section></div>
  </>;
}
