import { prisma } from "@popwam/db";
import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { appleWalletConfigured, googleWalletConfigured } from "@/lib/wallet";

export default async function AdminWalletPage() {
  const passes = await prisma.walletPass.findMany({ include: { virtualCard: { include: { user: { select: { email: true } } } } }, orderBy: { createdAt: "desc" }, take: 500 });
  return <><PageHeading eyebrow="Wallet passes" title="Wallet pass registry" description={`Google signing: ${googleWalletConfigured() ? "configured" : "not configured"} · Apple signing: ${appleWalletConfigured() ? "configured" : "not configured"}`}/><div className="card overflow-x-auto"><table className="w-full min-w-[750px] text-sm"><thead><tr>{["Card","Owner","Platform","Serial","Status","Generated"].map(label => <th className="p-3 text-start" key={label}>{label}</th>)}</tr></thead><tbody>{passes.map(pass => <tr className="border-t border-white/10" key={pass.id}><td className="p-3">{pass.virtualCard.name}</td><td className="p-3" dir="ltr">{pass.virtualCard.user.email}</td><td className="p-3">{pass.platform}</td><td className="p-3 font-mono" dir="ltr">{pass.serialNumber}</td><td className="p-3"><Badge value={pass.status}/></td><td className="p-3">{pass.lastGeneratedAt?.toLocaleString() || "—"}</td></tr>)}</tbody></table>{!passes.length && <p className="p-5 text-slate-500">No wallet passes have been generated.</p>}</div></>;
}
