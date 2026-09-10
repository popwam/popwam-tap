import { Prisma, prisma } from "@popwam/db";
import { DashboardPageHeader, EmptyState, FilterBar, SearchField } from "@/components/admin-ui";
import { AddLinkPlatformButton, LinkPlatformAdminCatalog } from "@/components/link-platform-admin-catalog";
import { getI18n } from "@/lib/i18n";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Admin link platforms" };

export default async function LinkPlatformsPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; inputType?: string; category?: string; sort?: string }> }) {
  await requireAdmin();
  const [{ locale }, filters, categories] = await Promise.all([
    getI18n(),
    searchParams,
    prisma.linkPlatform.findMany({ distinct: ["category"], orderBy: { category: "asc" }, select: { category: true } }),
  ]);
  const ar = locale === "ar";
  const q = filters.q?.trim().slice(0, 100) || "";
  const state = filters.state === "active" || filters.state === "disabled" ? filters.state : "";
  const sort = ["order", "name", "usage"].includes(filters.sort || "") ? filters.sort! : "order";
  const where: Prisma.LinkPlatformWhereInput = {
    ...(state ? { isActive: state === "active" } : {}),
    ...(filters.inputType ? { inputType: filters.inputType } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(q ? { OR: [{ nameEn: { contains: q, mode: "insensitive" } }, { nameAr: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const platforms = await prisma.linkPlatform.findMany({
    where,
    orderBy: sort === "name" ? [{ nameEn: "asc" }] : [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
  const usage = platforms.length ? await prisma.destination.groupBy({
    by: ["linkPlatformId"],
    where: { linkPlatformId: { in: platforms.map(platform => platform.id) } },
    _count: { _all: true },
  }) : [];
  const usageById = new Map(usage.map(item => [item.linkPlatformId, item._count._all]));
  const items = platforms.map(platform => ({
    id: platform.id, nameAr: platform.nameAr, nameEn: platform.nameEn, slug: platform.slug,
    iconKey: platform.iconKey, customIconUrl: platform.customIconUrl, placeholder: platform.placeholder,
    validationPattern: platform.validationPattern, category: platform.category, inputType: platform.inputType,
    urlTemplate: platform.urlTemplate, androidAppUrl: platform.androidAppUrl, iosAppUrl: platform.iosAppUrl,
    webFallback: platform.webFallback, helpAr: platform.helpAr, helpEn: platform.helpEn,
    isActive: platform.isActive, sortOrder: platform.sortOrder, allowCustomLabel: platform.allowCustomLabel,
    allowCustomIcon: platform.allowCustomIcon, usageCount: usageById.get(platform.id) || 0,
  })).sort((a, b) => sort === "usage" ? b.usageCount - a.usageCount || a.sortOrder - b.sortOrder : 0);
  const copy = ar ? {
    eyebrow: "إدارة الروابط", title: "منصات الروابط", description: "كتالوج POP للمنصات العامة، وبناء الروابط، والتحقق، وفتح التطبيقات بأمان.",
    search: "ابحث بالاسم أو المعرّف", allStates: "كل الحالات", activeOnly: "المفعّلة", disabledOnly: "المعطّلة", allInputs: "كل أنواع الإدخال", allCategories: "كل الفئات", order: "الترتيب", byName: "الاسم", byUsage: "الأكثر استخدامًا", apply: "تطبيق",
    add: "إضافة منصة", edit: "تعديل", close: "إغلاق", save: "حفظ المنصة", disable: "تعطيل", enable: "تفعيل", used: "مرات الاستخدام", builder: "بناء الرابط", validation: "التحقق", appLinks: "روابط التطبيقات", fallback: "الرابط البديل", noBuilder: "إدخال مباشر", noValidation: "تحقق أساسي", none: "لا يوجد", identity: "هوية المنصة", behavior: "الإدخال وبناء الرابط", guidance: "إرشادات المستخدم", options: "الإتاحة والتخصيص", icon: "أيقونة المنصة", upload: "رفع أيقونة", active: "منصة مفعّلة", customLabel: "السماح باسم مخصص", customIcon: "السماح بأيقونة مخصصة", disableConfirm: "تعطيل المنصة من الاختيارات الجديدة", empty: "لا توجد منصات مطابقة", emptyHelp: "جرّب تعديل البحث أو الفلاتر.",
  } : {
    eyebrow: "Link administration", title: "Link platforms", description: "POP's catalog for public platforms, link builders, validation, and safe app opening.",
    search: "Search name or slug", allStates: "All states", activeOnly: "Active", disabledOnly: "Disabled", allInputs: "All input modes", allCategories: "All categories", order: "Sort order", byName: "Name", byUsage: "Most used", apply: "Apply",
    add: "Add platform", edit: "Edit", close: "Close", save: "Save platform", disable: "Disable", enable: "Enable", used: "Uses", builder: "Link builder", validation: "Validation", appLinks: "App links", fallback: "Fallback", noBuilder: "Direct input", noValidation: "Basic checks", none: "None", identity: "Platform identity", behavior: "Input and link behavior", guidance: "User guidance", options: "Availability and customization", icon: "Platform icon", upload: "Upload icon", active: "Platform active", customLabel: "Allow custom label", customIcon: "Allow custom icon", disableConfirm: "Disable this platform for new selections", empty: "No platforms match", emptyHelp: "Try adjusting the search or filters.",
  };
  return <>
    <DashboardPageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} action={<AddLinkPlatformButton copy={copy}/>}/>
    <form action="/admin/link-platforms"><FilterBar>
      <SearchField defaultValue={q} placeholder={copy.search}/>
      <select className="input md:max-w-40" name="state" defaultValue={state}><option value="">{copy.allStates}</option><option value="active">{copy.activeOnly}</option><option value="disabled">{copy.disabledOnly}</option></select>
      <select className="input md:max-w-48" name="inputType" defaultValue={filters.inputType || ""}><option value="">{copy.allInputs}</option>{["USERNAME", "PHONE", "EMAIL", "FULL_URL", "USERNAME_OR_URL", "CHANNEL_ID", "CUSTOM_TEXT"].map(value => <option key={value}>{value}</option>)}</select>
      <select className="input md:max-w-40" name="category" defaultValue={filters.category || ""}><option value="">{copy.allCategories}</option>{categories.map(item => <option key={item.category}>{item.category}</option>)}</select>
      <select className="input md:max-w-40" name="sort" defaultValue={sort}><option value="order">{copy.order}</option><option value="name">{copy.byName}</option><option value="usage">{copy.byUsage}</option></select>
      <button className="btn-primary">{copy.apply}</button>
    </FilterBar></form>
    {items.length ? <LinkPlatformAdminCatalog platforms={items} copy={copy}/> : <div className="admin-table-shell"><EmptyState title={copy.empty} description={copy.emptyHelp}/></div>}
  </>;
}
