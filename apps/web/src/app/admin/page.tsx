import Link from "next/link";
import { Prisma, prisma } from "@popwam/db";
import { AlertTriangle, ArrowUpRight, Bell, CreditCard, Gauge, Package, Receipt, Users, WalletCards } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { calculateInventoryByProduct } from "@/lib/inventory";
import { getPlatformReadiness } from "@/lib/platform-readiness";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const [users, profiles, publishedProfiles, verificationPending, quotaPending, sessions, campaigns, readiness, inventory, movements, purchases, expenses, cards, orders, activity] = await Promise.all([
    prisma.user.count(),
    prisma.profile.count({ where: { lifecycle: { not: "ARCHIVED" } } }),
    prisma.profile.count({ where: { lifecycle: "PUBLISHED" } }),
    prisma.profileVerificationCase.count({ where: { status: "PENDING" } }),
    prisma.quotaIncreaseRequest.count({ where: { status: "PENDING" } }),
    prisma.deviceSession.count({ where: { revokedAt: null } }),
    prisma.adminNotificationCampaign.aggregate({ _count: true, _sum: { successCount: true, failureCount: true } }),
    getPlatformReadiness(),
    prisma.inventoryItem.findMany({ select: { id: true, quantityOnHand: true, unitCost: true } }),
    prisma.inventoryMovement.findMany({ select: { inventoryItemId: true, type: true, quantity: true } }),
    prisma.purchase.aggregate({ _sum: { totalCost: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.card.findMany({ select: { ownerId: true, cardStatus: true, inventoryStatus: true, batch: { select: { expectedSellingPrice: true, unitPurchaseCost: true, unitProgrammingCost: true, unitPackagingCost: true } } } }),
    prisma.order.aggregate({ _sum: { paidAmount: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, operation: true, createdAt: true, actor: { select: { name: true, email: true } } } }),
  ]);
  const zero = new Prisma.Decimal(0);
  const balances = calculateInventoryByProduct(movements.map(item => ({ productId: item.inventoryItemId, type: item.type, quantity: item.quantity })));
  const rawAvailable = [...balances.values()].reduce((sum, quantity) => sum + Math.max(0, quantity), 0);
  const rawInventoryValue = inventory.reduce((sum, item) => sum.plus(item.unitCost.mul(Math.max(0, balances.get(item.id) ?? 0))), zero);
  const availableCards = cards.filter(item => item.inventoryStatus === "AVAILABLE" || item.inventoryStatus === "PROGRAMMED");
  const producedInventoryValue = availableCards.reduce((sum, item) => sum.plus(item.batch ? item.batch.unitPurchaseCost.plus(item.batch.unitProgrammingCost).plus(item.batch.unitPackagingCost) : zero), zero);
  const expectedRevenue = availableCards.reduce((sum, item) => sum.plus(item.batch?.expectedSellingPrice || zero), zero);
  const realizedRevenue = orders._sum.paidAmount || zero;
  const totalPurchases = purchases._sum.totalCost || zero;
  const totalExpenses = expenses._sum.amount || zero;
  const operational = [
    ["Users", users, Users], ["Active profiles", profiles, Users], ["Published profiles", publishedProfiles, Gauge],
    ["Pending verification", verificationPending, AlertTriangle], ["Pending quota requests", quotaPending, AlertTriangle], ["Active sessions", sessions, CreditCard],
  ] as const;
  const quickActions = [
    ["Profiles", "/admin/profiles"], ["Users", "/admin/users"], ["Notifications", "/admin/notifications"],
    ["Platform readiness", "/admin/platform-readiness"], ["Legal", "/admin/legal"], ["Localization", "/admin/localization"],
  ] as const;
  const financial: Array<[string, string | number, typeof Package]> = [
    ["Available products", rawAvailable + availableCards.length, Package],
    ["Inventory value", rawInventoryValue.plus(producedInventoryValue).toFixed(2), WalletCards],
    ["Purchases", totalPurchases.toFixed(2), Receipt],
    ["Expenses", totalExpenses.toFixed(2), Receipt],
    ["Expected revenue", expectedRevenue.toFixed(2), WalletCards],
    ["Realized revenue", realizedRevenue.toFixed(2), WalletCards],
  ];
  return <><PageHeading eyebrow="Operations" title="POP control center" description="Live account, identity, configuration, messaging, inventory and system-health signals."/>
    <section className={`card mb-6 flex flex-wrap items-center justify-between gap-4 p-5 ${readiness.ready ? "ring-1 ring-emerald-500/30" : "ring-1 ring-rose-500/40"}`}><div><p className="text-sm text-slate-400">Platform readiness</p><h2 className={`text-2xl font-black ${readiness.ready ? "text-emerald-300" : "text-rose-300"}`}>{readiness.ready ? "READY" : `${readiness.issues.length} ISSUE${readiness.issues.length === 1 ? "" : "S"}`}</h2></div><Link className="btn-secondary" href="/admin/platform-readiness">Inspect blockers <ArrowUpRight size={14}/></Link></section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{operational.map(([label, value, Icon]) => <div className="card p-5" key={label}><Icon size={20} className="text-brand-400"/><p className="mt-4 text-2xl font-black">{value}</p><p className="mt-1 text-sm text-slate-400">{label}</p></div>)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-3"><section className="card p-5 xl:col-span-2"><h2 className="font-black">Quick actions</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{quickActions.map(([label, href]) => <Link href={href} className="flex items-center justify-between rounded-xl bg-white/5 p-4 font-bold hover:bg-white/10" key={href}>{label}<ArrowUpRight size={16}/></Link>)}</div></section><section className="card p-5"><Bell className="text-brand-400"/><h2 className="mt-3 font-black">Notifications</h2><p className="mt-3 text-3xl font-black">{campaigns._count}</p><p className="text-sm text-slate-400">campaigns · {campaigns._sum.successCount || 0} recipients accepted by FCM · {campaigns._sum.failureCount || 0} failed</p><Link className="btn-secondary mt-4" href="/admin/notifications">Open center</Link></section></div>
    <div className="mt-6 grid gap-5 xl:grid-cols-2"><section className="card p-5"><h2 className="font-black">Commerce & inventory snapshot</h2><div className="mt-4 grid grid-cols-2 gap-3 text-sm">{financial.map(([label, value, Icon]) => <div className="rounded-xl bg-white/5 p-3" key={label}><Icon size={16} className="text-brand-400"/><b className="mt-2 block text-lg">{value}</b><span className="text-slate-500">{label}</span></div>)}</div></section><section className="card p-5"><h2 className="font-black">Recent audited activity</h2><div className="mt-3 divide-y divide-white/10">{activity.map(item => <div className="flex justify-between gap-4 py-3 text-sm" key={item.id}><div><b>{item.operation}</b><p className="text-xs text-slate-500">{item.actor?.name || item.actor?.email || "System"}</p></div><time className="text-xs text-slate-500">{item.createdAt.toLocaleString()}</time></div>)}{!activity.length && <p className="text-slate-500">No audited activity yet.</p>}</div></section></div>
  </>;
}
