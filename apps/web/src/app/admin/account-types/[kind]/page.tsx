import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileKind, prisma } from "@popwam/db";
import { ArrowLeft, Save } from "lucide-react";
import { DashboardPageHeader } from "@/components/admin-ui";
import {
  getAccountTypePolicies,
  MODULE_STATES,
} from "@/lib/account-type-policy";
import { getI18n } from "@/lib/i18n";
import { requireAdmin } from "@/lib/session";
import { saveAccountType } from "../actions";

export default async function AccountTypeEditor({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  await requireAdmin();
  const kind = (await params).kind.toUpperCase() as ProfileKind;
  if (!Object.values(ProfileKind).includes(kind)) notFound();
  const [{ locale }, policies, definitions] = await Promise.all([
    getI18n(),
    getAccountTypePolicies(),
    prisma.profileModuleDefinition.findMany({
      where: { isActive: true },
      orderBy: { key: "asc" },
    }),
  ]);
  const ar = locale === "ar",
    policy = policies[kind];
  const copy = ar
    ? {
        eyebrow: "نوع الحساب",
        description:
          "حدّد حالة كل وحدة بوضوح. لا تُحذف الوحدات أو الملفات القائمة.",
        back: "العودة للأنواع",
        names: "الأسماء والحالة",
        modules: "الوحدات",
        publish: "متطلبات النشر",
        enabled: "مفعّل",
        verify: "يتطلب تحققًا",
        avatar: kind === "BUSINESS" ? "يتطلب شعارًا/صورة" : "يتطلب صورة شخصية",
        cover: "يتطلب غلافًا",
        save: "حفظ الإعداد",
        required: "مطلوب",
        optional: "اختياري",
        disabled: "معطّل",
      }
    : {
        eyebrow: "Account type",
        description:
          "Set an explicit state for each real module. Existing modules and profiles are not deleted.",
        back: "Back to account types",
        names: "Names & availability",
        modules: "Modules",
        publish: "Publishing requirements",
        enabled: "Enabled",
        verify: "Verification required",
        avatar:
          kind === "BUSINESS" ? "Logo/avatar required" : "Avatar required",
        cover: "Cover required",
        save: "Save configuration",
        required: "Required",
        optional: "Optional",
        disabled: "Disabled",
      };
  const labels = {
    REQUIRED: copy.required,
    OPTIONAL: copy.optional,
    DISABLED: copy.disabled,
  };
  return (
    <>
      <DashboardPageHeader
        eyebrow={copy.eyebrow}
        title={ar ? policy.nameAr : policy.nameEn}
        description={copy.description}
        action={
          <Link className="btn-secondary" href="/admin/account-types">
            <ArrowLeft className="directional-icon" size={15} />
            {copy.back}
          </Link>
        }
      />
      <form action={saveAccountType} className="space-y-5">
        <input type="hidden" name="key" value={kind} />
        <section className="admin-section-card">
          <h2>{copy.names}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label>
              <span className="label">العربية</span>
              <input
                className="input"
                name="nameAr"
                defaultValue={policy.nameAr}
                dir="rtl"
                required
              />
            </label>
            <label>
              <span className="label">English</span>
              <input
                className="input"
                name="nameEn"
                defaultValue={policy.nameEn}
                dir="ltr"
                required
              />
            </label>
            <label>
              <span className="label">Français</span>
              <input
                className="input"
                name="nameFr"
                defaultValue={policy.nameFr}
                dir="ltr"
                required
              />
            </label>
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={policy.enabled}
            />
            {copy.enabled}
          </label>
        </section>
        <section className="admin-section-card">
          <h2>{copy.modules}</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {definitions.map((definition) => (
              <div
                className="rounded-xl border border-white/10 p-4"
                key={definition.key}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <b>{ar ? definition.nameAr : definition.nameEn}</b>
                    <code className="ms-2 text-xs text-slate-500" dir="ltr">
                      {definition.key}
                    </code>
                  </div>
                  <div className="flex rounded-xl bg-black/20 p-1">
                    {MODULE_STATES.map((state) => (
                      <label className="cursor-pointer">
                        <input
                          className="peer sr-only"
                          type="radio"
                          name={`module_${definition.key}`}
                          value={state}
                          defaultChecked={
                            policy.modules[definition.key] === state
                          }
                        />
                        <span className="block rounded-lg px-2 py-1.5 text-[11px] text-slate-500 peer-checked:bg-brand-500/20 peer-checked:text-brand-200">
                          {labels[state]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-section-card">
          <h2>{copy.publish}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["requireVerification", copy.verify, policy.requireVerification],
              ["requireAvatar", copy.avatar, policy.requireAvatar],
              ["requireCover", copy.cover, policy.requireCover],
            ].map(([name, label, checked]) => (
              <label
                className="rounded-xl border border-white/10 p-4 text-sm"
                key={String(name)}
              >
                <input
                  type="checkbox"
                  name={String(name)}
                  defaultChecked={Boolean(checked)}
                />{" "}
                {label}
              </label>
            ))}
          </div>
        </section>
        <button className="btn-primary">
          <Save size={16} />
          {copy.save}
        </button>
      </form>
    </>
  );
}
