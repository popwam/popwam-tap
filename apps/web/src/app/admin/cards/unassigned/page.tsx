import { prisma } from "@popwam/db";
import { getPermanentCardUrl } from "@popwam/shared";
import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";

export default async function UnassignedTagsPage() {
  const cards = await prisma.card.findMany({ where: { ownerId: null, inventoryStatus: { in: ["AVAILABLE", "PROGRAMMED"] } }, include: { batch: { include: { productionBatch: true } }, producedTag: true }, orderBy: { createdAt: "desc" } });
  return <><PageHeading eyebrow="Physical NFC" title="Unassigned tags / وسوم غير معيّنة" description="These immutable physical identities remain in inventory until an administrator assigns them."/><div className="card overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead><tr>{["Serial","Batch","Permanent URL","Status","Activation"].map(label => <th className="p-3 text-start" key={label}>{label}</th>)}</tr></thead><tbody>{cards.map(card => <tr className="border-t border-white/10" key={card.id}><td className="p-3 font-mono">{card.serialNumber}</td><td className="p-3 font-mono">{card.batch?.productionBatch?.batchCode || card.batch?.name || "—"}</td><td className="p-3"><a className="text-brand-400" href={getPermanentCardUrl(card.publicSlug)} target="_blank">{card.publicSlug}</a></td><td className="p-3"><Badge value={card.inventoryStatus}/></td><td className="p-3"><Badge value={card.producedTag?.status || "LEGACY"}/></td></tr>)}</tbody></table>{!cards.length && <p className="p-6 text-slate-500">No unassigned physical tags.</p>}</div></>;
}
