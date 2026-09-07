import Link from "next/link";
import { AccountStatus, Prisma, prisma, SystemRole } from "@popwam/db";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { AdminCreateUserForm } from "@/components/admin-create-user-form";
import { AdminDataTable, DashboardPageHeader, EmptyState, FilterBar, SearchField, StatusBadge, UserIdentityCell } from "@/components/admin-ui";
import { getI18n } from "@/lib/i18n";

export const metadata = { title: "Admin users" };
const PAGE_SIZE = 30;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; role?: string; plan?: string; customer?: string; page?: string }> }) {
  const [{ locale }, filters, plans] = await Promise.all([getI18n(), searchParams, prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, nameAr: true, nameEn: true } })]);
  const ar = locale === "ar";
  const q = filters.q?.trim().slice(0, 100) || "";
  const page = Math.max(1, Number.parseInt(filters.page || "1", 10) || 1);
  const where: Prisma.UserWhereInput = {
    ...(Object.values(AccountStatus).includes(filters.status as AccountStatus) ? { status: filters.status as AccountStatus } : {}),
    ...(Object.values(SystemRole).includes(filters.role as SystemRole) ? { role: filters.role as SystemRole } : {}),
    ...(filters.plan ? { subscriptions: { some: { status: "ACTIVE", plan: { slug: filters.plan } } } } : {}),
    ...(filters.customer === "1" ? { OR: [{ subscriptions: { some: {} } }, { customer: { is: { orders: { some: {} } } } }] } : {}),
    ...(q ? { AND: [{ OR: [{ id: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phoneE164: { contains: q } }] }] } : {}),
  };
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, image: true, role: true, status: true, createdAt: true, lastLoginAt: true,
        profiles: { orderBy: { isPrimary: "desc" }, take: 1, select: { avatarUrl: true } },
        subscriptions: { where: { status: "ACTIVE" }, orderBy: { startsAt: "desc" }, take: 1, select: { plan: { select: { name: true, nameAr: true, nameEn: true, slug: true } } } },
        _count: { select: { profiles: true } },
      },
      orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (next: number) => { const value = new URLSearchParams(); if(q)value.set("q",q); if(filters.status)value.set("status",filters.status); if(filters.role)value.set("role",filters.role); if(filters.plan)value.set("plan",filters.plan); if(filters.customer)value.set("customer",filters.customer); value.set("page",String(next)); return `/admin/users?${value}`; };
  const copy = ar ? {
    eyebrow:"إدارة المستخدمين",title:"المستخدمون",description:"كل ما يخص المستخدم في مكان واحد، بهوية واضحة بدل المعرّفات التقنية.",create:"إنشاء مستخدم",search:"ابحث بالاسم أو البريد أو المعرّف",allStatus:"كل الحالات",allRoles:"كل الأدوار",allPlans:"كل الباقات",filter:"تطبيق",user:"المستخدم",role:"الدور",plan:"الباقة",profiles:"الملفات",status:"الحالة",activity:"آخر نشاط",manage:"إدارة",never:"لا يوجد",empty:"لا يوجد مستخدمون مطابقون",emptyHelp:"جرّب تغيير عبارة البحث أو الفلاتر.",results:"نتيجة",page:"صفحة",
  } : {
    eyebrow:"User management",title:"Users",description:"Everything related to a person in one place, led by a clear human identity instead of technical IDs.",create:"Create user",search:"Search name, email, or internal ID",allStatus:"All statuses",allRoles:"All roles",allPlans:"All plans",filter:"Apply",user:"User",role:"Role",plan:"Plan",profiles:"Profiles",status:"Status",activity:"Last activity",manage:"Manage",never:"Never",empty:"No users match",emptyHelp:"Try changing the search term or filters.",results:"results",page:"Page",
  };
  return <>
    <DashboardPageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} action={<details className="relative"><summary className="btn-primary cursor-pointer list-none"><Plus size={16}/>{copy.create}</summary><div className="card absolute end-0 z-20 mt-2 w-[min(92vw,44rem)] p-5"><AdminCreateUserForm locale={locale}/></div></details>}/>
    <form action="/admin/users">
      <FilterBar>
        <SearchField defaultValue={q} placeholder={copy.search}/>
        <select className="input md:max-w-44" name="status" defaultValue={filters.status || ""}><option value="">{copy.allStatus}</option>{Object.values(AccountStatus).map(value=><option key={value}>{value}</option>)}</select>
        <select className="input md:max-w-40" name="role" defaultValue={filters.role || ""}><option value="">{copy.allRoles}</option>{Object.values(SystemRole).map(value=><option key={value}>{value}</option>)}</select>
        <select className="input md:max-w-44" name="plan" defaultValue={filters.plan || ""}><option value="">{copy.allPlans}</option>{plans.map(plan=><option value={plan.slug} key={plan.slug}>{(ar?plan.nameAr||plan.nameEn:plan.nameEn||plan.nameAr)||plan.name}</option>)}</select>
        {filters.customer&&<input type="hidden" name="customer" value={filters.customer}/>}<button className="btn-primary">{copy.filter}</button>
      </FilterBar>
    </form>
    <AdminDataTable minWidth={900}>
      <thead><tr><th>{copy.user}</th><th>{copy.role}</th><th>{copy.plan}</th><th>{copy.profiles}</th><th>{copy.status}</th><th>{copy.activity}</th><th/></tr></thead>
      <tbody>{users.map(user=>{const plan=user.subscriptions[0]?.plan;return <tr key={user.id}>
        <td><UserIdentityCell name={user.name} email={user.email} imageUrl={user.profiles[0]?.avatarUrl || user.image}/></td>
        <td data-label={copy.role}><StatusBadge value={user.role}/></td>
        <td data-label={copy.plan}><StatusBadge value={(ar?plan?.nameAr||plan?.nameEn:plan?.nameEn||plan?.nameAr)||plan?.name||"FREE"}/></td>
        <td data-label={copy.profiles}><b>{user._count.profiles}</b></td>
        <td data-label={copy.status}><StatusBadge value={user.status}/></td>
        <td data-label={copy.activity} className="text-xs text-slate-500">{user.lastLoginAt?.toLocaleString(locale) || copy.never}</td>
        <td><Link href={`/admin/users/${user.id}`} className="btn-secondary">{copy.manage}<ArrowRight className="directional-icon" size={14}/></Link></td>
      </tr>})}</tbody>
    </AdminDataTable>
    {!users.length&&<div className="admin-table-shell"><EmptyState title={copy.empty} description={copy.emptyHelp}/></div>}
    <footer className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{total} {copy.results} · {copy.page} {page}/{pages}</span><div className="flex gap-2">{page>1&&<Link className="btn-secondary" href={hrefFor(page-1)} aria-label="Previous page"><ArrowLeft className="directional-icon" size={15}/></Link>}{page<pages&&<Link className="btn-secondary" href={hrefFor(page+1)} aria-label="Next page"><ArrowRight className="directional-icon" size={15}/></Link>}</div></footer>
  </>;
}
