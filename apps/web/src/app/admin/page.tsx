import Link from "next/link";
import { prisma } from "@popwam/db";
import { Bell, CalendarDays, ClipboardList, Eye, Gauge, Layers3, Package, Sparkles, UserCheck, Users } from "lucide-react";
import { DashboardPageHeader, MetricCard, QuickActionCard, StatusBadge, UserIdentityCell } from "@/components/admin-ui";
import { getI18n } from "@/lib/i18n";

export const metadata = { title: "Admin overview" };

export default async function AdminPage() {
  const { locale } = await getI18n();
  const ar = locale === "ar";
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const [
    totalUsers, activeUsers, newUsers, paidSubscribers, publishedProfiles,
    totalOpens, todayOpens, monthOpens, subscriptionRequests, quotaRequests,
    featureRequests, campaigns, recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.userPlan.count({ where: { status: "ACTIVE", plan: { is: { slug: { not: "free" } } } } }),
    prisma.profile.count({ where: { lifecycle: "PUBLISHED" } }),
    prisma.card.aggregate({ _sum: { openCount: true } }),
    prisma.cardOpenDaily.aggregate({ where: { date: { gte: dayStart } }, _sum: { openCount: true } }),
    prisma.cardOpenDaily.aggregate({ where: { date: { gte: monthStart } }, _sum: { openCount: true } }),
    prisma.userPlan.count({ where: { status: { in: ["REQUESTED", "PAYMENT_PENDING", "PAYMENT_VERIFICATION", "APPROVED"] } } }),
    prisma.quotaIncreaseRequest.count({ where: { status: "PENDING" } }),
    prisma.featureRequest.count({ where: { status: { in: ["NEW", "REVIEWING"] } } }),
    prisma.adminNotificationCampaign.aggregate({ _count: true, _sum: { successCount: true } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, image: true, status: true, createdAt: true, profiles: { take: 1, select: { avatarUrl: true } } } }),
  ]);
  const pending = subscriptionRequests + quotaRequests + featureRequests;
  const copy = ar ? {
    eyebrow:"صحة المنتج",title:"هل ينمو POP ويحقق نتائج؟",description:"لقطة واضحة للنمو والنشاط والاشتراكات وفتحات ملفات POP من البيانات الحالية.",
    totalUsers:"إجمالي المستخدمين",activeUsers:"المستخدمون النشطون",paid:"مشتركون مدفوعون",published:"ملفات منشورة",totalOpens:"إجمالي فتحات POP",today:"فتحات اليوم",month:"فتحات هذا الشهر",
    activeNote:"حسابات حالتها ACTIVE",paidNote:"اشتراكات مدفوعة نشطة",opensNote:"فتحات مسجلة عبر كروت POP",quick:"إجراءات سريعة",quickHelp:"المسارات الأكثر استخدامًا في الإدارة.",
    inventory:"المخزون",users:"المستخدمون",notifications:"الإشعارات",requests:"الطلبات",plans:"الباقات",recent:"أحدث المستخدمين",attention:"يحتاج متابعة",newUsers:"مستخدم جديد خلال 30 يومًا",campaigns:"حملات الإشعارات",accepted:"مستلمًا قبلها FCM",viewAll:"عرض المستخدمين",none:"لا توجد حسابات بعد",
  } : {
    eyebrow:"Product health",title:"Is POP growing and performing?",description:"A clear snapshot of growth, activity, subscriptions, and real POP profile opens from current data.",
    totalUsers:"Total users",activeUsers:"Active users",paid:"Paid subscribers",published:"Published profiles",totalOpens:"Total POP opens",today:"Opens today",month:"Opens this month",
    activeNote:"Accounts with ACTIVE status",paidNote:"Active non-free subscriptions",opensNote:"Recorded through POP cards",quick:"Quick actions",quickHelp:"The admin paths you use most.",
    inventory:"Inventory",users:"Users",notifications:"Notifications",requests:"Requests",plans:"Plans",recent:"Newest users",attention:"Needs attention",newUsers:"new users in 30 days",campaigns:"notification campaigns",accepted:"recipients accepted by FCM",viewAll:"View all users",none:"No accounts yet",
  };
  return <>
    <DashboardPageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description}/>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title={copy.totalUsers} value={totalUsers} note={`${newUsers} ${copy.newUsers}`} icon={Users} emphasis/>
      <MetricCard title={copy.activeUsers} value={activeUsers} note={copy.activeNote} icon={UserCheck}/>
      <MetricCard title={copy.paid} value={paidSubscribers} note={copy.paidNote} icon={Sparkles} emphasis/>
      <MetricCard title={copy.published} value={publishedProfiles} icon={Gauge}/>
      <MetricCard title={copy.totalOpens} value={totalOpens._sum.openCount || 0} note={copy.opensNote} icon={Eye} emphasis/>
      <MetricCard title={copy.today} value={todayOpens._sum.openCount || 0} note={copy.opensNote} icon={CalendarDays}/>
      <MetricCard title={copy.month} value={monthOpens._sum.openCount || 0} note={copy.opensNote} icon={Eye}/>
    </section>

    <section className="admin-section-card mt-5">
      <h2>{copy.quick}</h2><p>{copy.quickHelp}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <QuickActionCard href="/admin/inventory" title={copy.inventory} icon={Package}/>
        <QuickActionCard href="/admin/users" title={copy.users} icon={Users}/>
        <QuickActionCard href="/admin/notifications" title={copy.notifications} icon={Bell}/>
        <QuickActionCard href="/admin/requests" title={copy.requests} description={`${pending} ${copy.attention}`} icon={ClipboardList}/>
        <QuickActionCard href="/admin/plans" title={copy.plans} icon={Layers3}/>
      </div>
    </section>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <section className="admin-section-card">
        <div className="flex items-center justify-between gap-3"><h2>{copy.recent}</h2><Link className="text-xs font-bold text-brand-400" href="/admin/users">{copy.viewAll}</Link></div>
        <div className="mt-3 divide-y divide-white/10">{recentUsers.map(user => <Link href={`/admin/users/${user.id}`} className="flex items-center justify-between gap-3 py-3" key={user.id}><UserIdentityCell name={user.name} email={user.email} imageUrl={user.profiles[0]?.avatarUrl || user.image}/><div className="shrink-0 text-end"><StatusBadge value={user.status}/><time className="mt-1 block text-[10px] text-slate-500">{user.createdAt.toLocaleDateString(locale)}</time></div></Link>)}{!recentUsers.length&&<p className="py-6 text-sm text-slate-500">{copy.none}</p>}</div>
      </section>
      <section className="admin-section-card">
        <h2>{copy.attention}</h2>
        <div className="mt-4 space-y-3">{[
          [ar?"طلبات الاشتراك":"Subscription requests",subscriptionRequests,"/admin/requests?type=subscription"],
          [ar?"طلبات زيادة الحدود":"Quota requests",quotaRequests,"/admin/requests?type=limit"],
          [ar?"طلبات الميزات":"Feature requests",featureRequests,"/admin/requests?type=feature"],
        ].map(([label,value,href])=><Link href={String(href)} className="flex items-center justify-between rounded-xl bg-white/[.035] p-3 text-sm" key={String(href)}><span>{String(label)}</span><b className="text-brand-400">{String(value)}</b></Link>)}</div>
        <div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs text-slate-500">{campaigns._count} {copy.campaigns}</p><p className="mt-1 text-sm font-bold">{campaigns._sum.successCount || 0} {copy.accepted}</p></div>
      </section>
    </div>
  </>;
}
