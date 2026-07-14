import { prisma } from "@popwam/db";
import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";

export default async function AdminTransfersPage() {
  const transfers = await prisma.tagTransfer.findMany({ include: { tag: true, fromUser: { select: { email: true } }, toUser: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
  return <><PageHeading eyebrow="Ownership" title="Tag transfers / عمليات النقل" description="Read-only audit view. Recipients must accept their own requests; administrators do not silently accept on their behalf."/><div className="card overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr>{["Card","From","To","Status","Expires","Created"].map(label => <th className="p-3 text-start" key={label}>{label}</th>)}</tr></thead><tbody>{transfers.map(item => <tr className="border-t border-white/10" key={item.id}><td className="p-3 font-mono">{item.tag.serialNumber}</td><td className="p-3" dir="ltr">{item.fromUser.email}</td><td className="p-3" dir="ltr">{item.toUser?.email || item.invitedEmail || "—"}</td><td className="p-3"><Badge value={item.status}/></td><td className="p-3">{item.expiresAt.toLocaleString()}</td><td className="p-3">{item.createdAt.toLocaleString()}</td></tr>)}</tbody></table>{!transfers.length && <p className="p-6 text-slate-500">No tag transfers.</p>}</div></>;
}
