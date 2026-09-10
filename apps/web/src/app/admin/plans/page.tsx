import Link from "next/link";
import { prisma } from "@popwam/db";
import { BarChart3, Copy, Edit3, Eye, Files, Link2, Plus, UserRound, type LucideIcon } from "lucide-react";
import { duplicateAdminPlan } from "@/app/actions";
import { DashboardPageHeader, EmptyState, StatusBadge } from "@/components/admin-ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { getI18n } from "@/lib/i18n";
import { formatStorageBytes } from "@/lib/plans";
import { planOpenPolicyKey, readProfileOpenPolicy } from "@/lib/plan-open-policy";

export default async function PlansPage() {
  const [{ locale }, plans] = await Promise.all([getI18n(), prisma.plan.findMany({ orderBy: [{ sortOrder: "asc" }, { maxLinks: "asc" }] })]);
  const ar = locale === "ar", now = new Date();
  const [subscriberGroups, policies] = await Promise.all([
    prisma.userPlan.groupBy({ by: ["planId"], where: { status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, _count: { _all: true } }),
    prisma.systemSetting.findMany({ where: { key: { in: plans.map(plan => planOpenPolicyKey(plan.id)) } }, select: { key: true, value: true } }),
  ]);
  const subscribers = new Map(subscriberGroups.map(item => [item.planId, item._count._all]));
  const policyMap = new Map(policies.map(item => [item.key, readProfileOpenPolicy(item.value)]));
  const copy = ar ? { eyebrow:"إدارة الاستحقاقات",title:"الباقات",description:"قارن حدود وميزات كل باقة واضبط الإعدادات الافتراضية، مع بقاء تجاوزات المستخدم مستقلة.",add:"إنشاء باقة",subscribers:"مشتركون نشطون",profiles:"الملفات",links:"الروابط",files:"الملفات المرفوعة",storage:"التخزين",opens:"فتح الملف",unlimited:"غير محدود",daily:"يوميًا",monthly:"شهريًا",analytics:"تحليلات الفتحات",noAnalytics:"بدون تحليلات",edit:"إدارة",duplicate:"نسخ",pricing:"السعر ودورة الفوترة غير ممثلين في دومين Plan الحالي",empty:"لا توجد باقات" } : { eyebrow:"Entitlement management",title:"Plans",description:"Compare each plan's limits and features while keeping user-specific overrides separate.",add:"Create plan",subscribers:"active subscribers",profiles:"Profiles",links:"Links",files:"Uploaded files",storage:"Storage",opens:"Profile opens",unlimited:"Unlimited",daily:"per day",monthly:"per month",analytics:"Opens analytics",noAnalytics:"No analytics",edit:"Manage",duplicate:"Duplicate",pricing:"Price and billing period are not represented in the current Plan domain",empty:"No plans configured" };
  return <><DashboardPageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} action={<Link href="/admin/plans/new" className="btn-primary"><Plus size={16}/>{copy.add}</Link>}/>
    <div className="grid gap-4 xl:grid-cols-2">{plans.map(plan=>{const policy=policyMap.get(planOpenPolicyKey(plan.id))||{mode:"UNLIMITED" as const};const opens=policy.mode==="UNLIMITED"?copy.unlimited:`${policy.limit.toLocaleString(locale)} ${policy.mode==="DAILY"?copy.daily:copy.monthly}`;const features=[plan.customSlugAllowed,plan.allowThemes,plan.allowCustomTheme,plan.allowFileUploads,plan.allowCustomIcons,plan.allowBusinessCards,plan.allowWalletPasses,plan.allowCustomLinks,plan.allowInstallableProfiles].filter(Boolean).length;const metrics:Array<[string,string|number,LucideIcon]>=[[copy.profiles,plan.maxProfiles,UserRound],[copy.links,plan.maxLinks,Link2],[copy.files,plan.maxFiles,Files],[copy.storage,formatStorageBytes(plan.maxStorageBytes),Files],[copy.opens,opens,Eye],[copy.analytics,plan.analyticsAllowed?copy.analytics:copy.noAnalytics,BarChart3]];return <article className="admin-section-card flex min-h-96 flex-col" key={plan.id}>
      <header className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="admin-eyebrow">{plan.slug}</p><h2 className="text-xl">{ar?plan.nameAr||plan.nameEn||plan.name:plan.nameEn||plan.nameAr||plan.name}</h2><p className="mt-1 text-sm text-slate-500">{ar?plan.nameEn:plan.nameAr}</p></div><StatusBadge value={plan.isActive?"ACTIVE":"INACTIVE"}/></header>
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-end justify-between gap-3"><div><p className="text-xs text-slate-500">{copy.subscribers}</p><strong className="mt-1 block text-2xl">{subscribers.get(plan.id)||0}</strong></div><UserRound className="text-brand-300" size={24}/></div><p className="mt-3 border-t border-white/10 pt-3 text-xs text-amber-200/80">{copy.pricing}</p></div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">{metrics.map(([label,value,Icon])=><div className="rounded-xl bg-white/[.035] p-3" key={label}><dt className="flex items-center gap-1 text-[10px] text-slate-500"><Icon size={12}/>{label}</dt><dd className="mt-1 font-bold">{String(value)}</dd></div>)}</dl>
      <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-500"><span>{features} {ar?"ميزات مفعلة":"features enabled"}</span><span>·</span><span>{Array.isArray(plan.availableProfileTypes)?plan.availableProfileTypes.length:0} {ar?"أنواع ملفات":"profile types"}</span>{plan.storefrontEnabled&&<><span>·</span><span>{ar?"واجهة عرض":"Storefront"}: {plan.storefrontMaxItems==null?copy.unlimited:plan.storefrontMaxItems}</span></>}</div>
      <footer className="mt-auto flex gap-2 border-t border-white/10 pt-4"><Link href={`/admin/plans/${plan.id}`} className="btn-primary flex-1"><Edit3 size={14}/>{copy.edit}</Link><form action={duplicateAdminPlan}><input type="hidden" name="id" value={plan.id}/><ConfirmSubmit className="btn-secondary" message="Create an inactive copy of this plan?"><Copy size={14}/><span className="sr-only">{copy.duplicate}</span></ConfirmSubmit></form></footer>
    </article>})}</div>{!plans.length&&<div className="admin-table-shell"><EmptyState title={copy.empty}/></div>}
  </>;
}
