import Link from "next/link";
import { prisma, type ProfileKind } from "@popwam/db";
import { Building2, ChevronRight, CircleUserRound } from "lucide-react";
import { DashboardPageHeader, StatusBadge } from "@/components/admin-ui";
import { getAccountTypePolicies } from "@/lib/account-type-policy";
import { getI18n } from "@/lib/i18n";
import { requireAdmin } from "@/lib/session";

export default async function AccountTypesPage() {
  await requireAdmin();
  const [{ locale }, policies, profileCounts] = await Promise.all([
    getI18n(),
    getAccountTypePolicies(),
    prisma.profile.groupBy({
      by: ["profileKind"],
      where: { profileKind: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const ar = locale === "ar";
  const copy = ar
    ? {
        eyebrow: "تهيئة الملفات",
        title: "أنواع الحسابات",
        description:
          "إعداد متطلبات الأنواع فوق بنية Profiles الحالية دون تغيير الملفات المنشورة تلقائيًا.",
        required: "مطلوب",
        optional: "اختياري",
        disabled: "معطّل",
        profiles: "ملفات حالية",
        edit: "تعديل",
        note: "التغييرات لا تلغي نشر الملفات الحالية؛ تُطبّق المتطلبات في محاولة النشر التالية.",
      }
    : {
        eyebrow: "Profile configuration",
        title: "Account types",
        description:
          "Configure type requirements on top of the existing Profiles architecture without silently changing published profiles.",
        required: "Required",
        optional: "Optional",
        disabled: "Disabled",
        profiles: "Existing profiles",
        edit: "Edit",
        note: "Changes do not unpublish existing profiles; requirements apply at the next publishing attempt.",
      };
  const counts = new Map(
    profileCounts.map((item) => [
      item.profileKind as ProfileKind,
      item._count._all,
    ]),
  );
  return (
    <>
      <DashboardPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <p className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
        {copy.note}
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        {Object.values(policies).map((policy) => {
          const required = Object.values(policy.modules).filter(
              (state) => state === "REQUIRED",
            ).length,
            optional = Object.values(policy.modules).filter(
              (state) => state === "OPTIONAL",
            ).length,
            disabled = Object.values(policy.modules).filter(
              (state) => state === "DISABLED",
            ).length;
          const Icon = policy.key === "BUSINESS" ? Building2 : CircleUserRound;
          return (
            <article className="admin-section-card" key={policy.key}>
              <header className="flex items-start justify-between gap-4">
                <span className="admin-metric-icon">
                  <Icon size={20} />
                </span>
                <StatusBadge value={policy.enabled ? "ENABLED" : "DISABLED"} />
              </header>
              <p className="admin-eyebrow mt-5" dir="ltr">
                {policy.key}
              </p>
              <h2 className="text-2xl">{ar ? policy.nameAr : policy.nameEn}</h2>
              <p className="mt-1 text-sm text-slate-500">{policy.nameFr}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  [copy.required, required],
                  [copy.optional, optional],
                  [copy.disabled, disabled],
                  [copy.profiles, counts.get(policy.key) || 0],
                ].map(([label, value]) => (
                  <div
                    className="rounded-xl bg-white/[.035] p-3"
                    key={String(label)}
                  >
                    <strong className="block text-xl">{value}</strong>
                    <span className="text-xs text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {policy.requireVerification && (
                  <StatusBadge value="VERIFICATION REQUIRED" />
                )}
                {policy.requireAvatar && (
                  <StatusBadge value="AVATAR REQUIRED" />
                )}
                {policy.requireCover && <StatusBadge value="COVER REQUIRED" />}
              </div>
              <Link
                className="btn-primary mt-5"
                href={`/admin/account-types/${policy.key.toLowerCase()}`}
              >
                {copy.edit}
                <ChevronRight className="directional-icon" size={15} />
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}
