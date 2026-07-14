import { prisma } from "@popwam/db";
import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";

export default async function AdminVirtualCardsPage() {
  const cards = await prisma.virtualCard.findMany({ include: { user: { select: { email: true } }, profile: true, template: true, _count: { select: { walletPasses: true, cards: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
  return <><PageHeading eyebrow="Identity" title="Virtual cards / البطاقات الافتراضية" description="Each virtual card owns a separate profile, links, template, QR destination and optional Wallet passes."/><div className="card overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr>{["Card","Owner","Type","Default","Template","Physical tags","Wallet passes","Status"].map(label => <th className="p-3 text-start" key={label}>{label}</th>)}</tr></thead><tbody>{cards.map(card => <tr className="border-t border-white/10" key={card.id}><td className="p-3"><strong>{card.name}</strong><p className="text-xs text-slate-500">{card.profile.displayName}</p></td><td className="p-3" dir="ltr">{card.user.email}</td><td className="p-3">{card.type}</td><td className="p-3">{card.isDefault ? "Yes" : "No"}</td><td className="p-3">{card.template?.nameEn || "Legacy fallback"}</td><td className="p-3">{card._count.cards}</td><td className="p-3">{card._count.walletPasses}</td><td className="p-3"><Badge value={card.status}/></td></tr>)}</tbody></table>{!cards.length && <p className="p-6 text-slate-500">No virtual cards.</p>}</div></>;
}
