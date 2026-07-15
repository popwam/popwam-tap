import { prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/session";
import { getUserEntitlements } from "@/lib/plans";
import { appleWalletConfigured, googleWalletConfigured } from "@/lib/wallet";

export default async function WalletPage() {
  const user = await requireUser();
  const [{ effective }, cards] = await Promise.all([getUserEntitlements(user.id), prisma.virtualCard.findMany({ where: { userId: user.id, status: "ACTIVE" }, include: { profile: true, walletPasses: true }, orderBy: { createdAt: "asc" } })]);
  return <><PageHeading eyebrow="Wallet" title="Google Wallet & Apple Wallet" description="Wallet passes use the public profile QR. They are not payment cards and do not write the physical NFC tag."/>
    {!effective.allowWalletPasses && <div className="card mb-5 border-amber-400/20 p-5 text-amber-200">Wallet passes require an eligible plan.</div>}
    <div className="grid gap-4 xl:grid-cols-2">{cards.map(card => {const googleReady=effective.allowWalletPasses&&googleWalletConfigured();const appleReady=effective.allowWalletPasses&&appleWalletConfigured();return <section className="card p-5" key={card.id}><h2 className="font-bold">{card.name}</h2><p className="mt-1 text-sm text-slate-500">{card.profile.displayName} · {card.type}</p><div className="mt-4 flex flex-wrap gap-3">{googleReady?<a className="btn-primary" href={`/api/wallet/google/${card.id}`}>Add to Google Wallet</a>:<button className="btn-primary" disabled>Add to Google Wallet</button>}{appleReady?<a className="btn-secondary" href={`/api/wallet/apple/${card.id}`}>Add to Apple Wallet</a>:<button className="btn-secondary" disabled>Add to Apple Wallet</button>}</div><p className="mt-3 text-xs text-slate-500">Google: {googleWalletConfigured() ? "configured" : "Not configured — issuer/signing credentials are missing"} · Apple: {appleWalletConfigured() ? "configured" : "Not configured — certificates are missing"}</p></section>})}</div>
  </>;
}
