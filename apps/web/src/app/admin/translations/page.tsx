import Link from "next/link";
import { prisma } from "@popwam/db";
import { Languages, Search, TriangleAlert } from "lucide-react";
import en from "../../../../locales/en.json";
import {
  saveLocalizationRuntime,
  saveTranslationKey,
} from "@/app/localization-actions";
import {
  DashboardPageHeader,
  EmptyState,
  FilterBar,
  MetricCard,
  StatusBadge,
} from "@/components/admin-ui";
import { getI18n } from "@/lib/i18n";
import { getRuntimeLocalizationConfig } from "@/lib/localization-runtime";
import {
  LOCALIZATION_SETTING_KEY,
  sanitizeLocalizationConfig,
  type RuntimeLocale,
} from "@/lib/localization-policy";
import {
  filterTranslationKeys,
  flattenTranslations,
  translationCoverage,
  translationNamespace,
} from "@/lib/translation-editor";
import { requireAdmin } from "@/lib/session";

type Params = {
  key?: string;
  q?: string;
  namespace?: string;
  missing?: string;
  page?: string;
};
const PAGE_SIZE = 50;

export default async function TranslationsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await requireAdmin();
  const [params, configured, { locale }, setting] = await Promise.all([
    searchParams,
    getRuntimeLocalizationConfig(),
    getI18n(),
    prisma.systemSetting.findUnique({
      where: { key: LOCALIZATION_SETTING_KEY },
      select: { updatedAt: true },
    }),
  ]);
  const ar = locale === "ar",
    config = sanitizeLocalizationConfig(configured);
  const source = {
    ...flattenTranslations(en),
    ...config.locales.find((item) => item.code === "en")?.translations,
  };
  const localeFor = (code: string): RuntimeLocale =>
    code === "en"
      ? {
          code,
          name: "English",
          nativeName: "English",
          rtl: false,
          enabled: true,
          published: true,
          displayOrder: 0,
          translations: source,
        }
      : config.locales.find((item) => item.code === code) || {
          code,
          name: code,
          nativeName: code,
          rtl: code === "ar",
          enabled: false,
          published: false,
          displayOrder: 99,
          translations: {},
        };
  const locales = [localeFor("ar"), localeFor("en"), localeFor("fr")];
  const keys = [
    ...new Set([
      ...Object.keys(source),
      ...config.locales.flatMap((item) => Object.keys(item.translations)),
    ]),
  ].sort();
  let filtered = filterTranslationKeys(keys, source, locales, {
    query: params.q,
    namespace: params.namespace,
  });
  if (params.missing)
    filtered = filtered.filter((key) =>
      params.missing === "all"
        ? locales.some((item) => !item.translations[key]?.trim())
        : !localeFor(params.missing!).translations[key]?.trim(),
    );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    page = Math.min(Math.max(1, Number(params.page) || 1), pageCount),
    displayed = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedKey =
    params.key && keys.includes(params.key) ? params.key : displayed[0] || "";
  const selected = selectedKey
    ? {
        key: selectedKey,
        values: Object.fromEntries(
          locales.map((item) => [
            item.code,
            item.translations[selectedKey] || "",
          ]),
        ),
      }
    : null;
  const namespaces = [...new Set(keys.map(translationNamespace))].sort();
  const coverage = Object.fromEntries(
    locales.map((item) => [item.code, translationCoverage(keys, item)]),
  );
  const complete = keys.filter((key) =>
    locales.every((item) => item.translations[key]?.trim()),
  ).length;
  const copy = ar
    ? {
        eyebrow: "المحتوى المحلي",
        title: "اللغات والترجمات",
        description:
          "إدارة مفاتيح العربية والإنجليزية والفرنسية دون تحميل محرر ضخم لكل المفاتيح.",
        total: "إجمالي المفاتيح",
        complete: "مكتملة",
        missingAr: "عربية ناقصة",
        missingEn: "إنجليزية ناقصة",
        missingFr: "فرنسية ناقصة",
        search: "ابحث بالمفتاح أو النص المترجم",
        allNamespaces: "كل الأقسام",
        allMissing: "أي ترجمة ناقصة",
        filter: "تصفية",
        editor: "محرر المفتاح",
        key: "مفتاح ثابت",
        save: "حفظ ونشر",
        empty: "لا توجد مفاتيح مطابقة",
        cannot: "لا يمكن تحديد الاستخدام بأمان",
        languages: "إعدادات اللغات",
        previous: "السابق",
        next: "التالي",
      }
    : {
        eyebrow: "Localized content",
        title: "Languages & translations",
        description:
          "Manage Arabic, English, and French keys without rendering a heavy editor for the full catalogue.",
        total: "Total keys",
        complete: "Complete",
        missingAr: "Missing Arabic",
        missingEn: "Missing English",
        missingFr: "Missing French",
        search: "Search key or translated text",
        allNamespaces: "All namespaces",
        allMissing: "Any missing translation",
        filter: "Filter",
        editor: "Translation editor",
        key: "Stable key",
        save: "Save & publish",
        empty: "No matching translation keys",
        cannot: "Usage cannot be determined safely",
        languages: "Language settings",
        previous: "Previous",
        next: "Next",
      };
  const href = (overrides: Record<string, string | undefined>) =>
    `/admin/translations?${new URLSearchParams(Object.entries({ q: params.q, namespace: params.namespace, missing: params.missing, page: String(page), ...overrides }).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString()}`;
  return (
    <>
      <DashboardPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title={copy.total}
          value={keys.length}
          icon={Languages}
          emphasis
        />
        <MetricCard title={copy.complete} value={complete} icon={Languages} />
        <MetricCard
          title={copy.missingAr}
          value={coverage.ar.missing}
          icon={TriangleAlert}
        />
        <MetricCard
          title={copy.missingEn}
          value={coverage.en.missing}
          icon={TriangleAlert}
        />
        <MetricCard
          title={copy.missingFr}
          value={coverage.fr.missing}
          icon={TriangleAlert}
        />
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {locales.map((item) => (
          <div className="admin-section-card" key={item.code}>
            <div className="flex items-center justify-between">
              <b>{item.nativeName}</b>
              <span dir="ltr">
                {item.code.toUpperCase()} · {item.rtl ? "RTL" : "LTR"}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full bg-brand-400"
                style={{ width: `${coverage[item.code].percentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {coverage[item.code].percentage}% · {coverage[item.code].missing}{" "}
              missing
            </p>
          </div>
        ))}
      </div>
      <form>
        <FilterBar>
          <label className="relative min-w-0 flex-1">
            <Search
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={17}
            />
            <input
              className="input ps-10"
              name="q"
              defaultValue={params.q}
              placeholder={copy.search}
            />
          </label>
          <select
            className="input md:max-w-52"
            name="namespace"
            defaultValue={params.namespace || ""}
          >
            <option value="">{copy.allNamespaces}</option>
            {namespaces.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            className="input md:max-w-52"
            name="missing"
            defaultValue={params.missing || ""}
          >
            <option value="">
              {ar ? "كل حالات الاكتمال" : "All completion states"}
            </option>
            <option value="all">{copy.allMissing}</option>
            <option value="ar">{copy.missingAr}</option>
            <option value="en">{copy.missingEn}</option>
            <option value="fr">{copy.missingFr}</option>
          </select>
          <button className="btn-secondary">{copy.filter}</button>
        </FilterBar>
      </form>
      <div className="grid gap-5 xl:grid-cols-[minmax(300px,.85fr)_minmax(460px,1.25fr)]">
        <section className="admin-table persuaded">
          <div className="admin-table-shell">
            <div className="divide-y divide-white/10">
              {displayed.map((key) => {
                const missing = locales
                  .filter((item) => !item.translations[key]?.trim())
                  .map((item) => item.code.toUpperCase());
                return (
                  <Link
                    className={`block p-4 hover:bg-white/[.035] ${selectedKey === key ? "bg-brand-500/10" : ""}`}
                    href={href({ key })}
                    key={key}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <code className="min-w-0 break-all text-xs" dir="ltr">
                        {key}
                      </code>
                      {missing.length ? (
                        <span className="shrink-0 text-[10px] text-amber-300">
                          {missing.join(" · ")}
                        </span>
                      ) : (
                        <StatusBadge value="COMPLETE" />
                      )}
                    </div>
                    <p
                      className="mt-2 truncate text-xs text-slate-500"
                      dir="ltr"
                    >
                      {source[key] || "—"}
                    </p>
                    <small className="mt-1 block text-[10px] text-slate-600">
                      {translationNamespace(key)} · {copy.cannot}
                    </small>
                  </Link>
                );
              })}
            </div>
            {!displayed.length && <EmptyState title={copy.empty} />}
          </div>
          <nav className="mt-3 flex items-center justify-between text-xs">
            <Link
              className={`btn-secondary ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
              href={href({ page: String(page - 1), key: undefined })}
            >
              {copy.previous}
            </Link>
            <span>
              {page} / {pageCount} · {filtered.length}
            </span>
            <Link
              className={`btn-secondary ${page === pageCount ? "pointer-events-none opacity-40" : ""}`}
              href={href({ page: String(page + 1), key: undefined })}
            >
              {copy.next}
            </Link>
          </nav>
        </section>
        <section className="admin-section-card">
          <h2>{copy.editor}</h2>
          {selected ? (
            <form action={saveTranslationKey} className="mt-4 space-y-4">
              <label>
                <span className="label">{copy.key}</span>
                <input
                  className="input font-mono"
                  name="key"
                  defaultValue={selected.key}
                  dir="ltr"
                  required
                />
              </label>
              {locales.map((item) => (
                <label className="block" key={item.code}>
                  <span className="label flex justify-between">
                    <span>{item.nativeName}</span>
                    {!selected.values[item.code]?.trim() && (
                      <span className="text-amber-300">Missing</span>
                    )}
                  </span>
                  <textarea
                    className="input min-h-28"
                    name={`value_${item.code}`}
                    defaultValue={selected.values[item.code] || ""}
                    dir={item.rtl ? "rtl" : "ltr"}
                    required
                  />
                </label>
              ))}
              <button className="btn-primary">{copy.save}</button>
              <p className="text-xs text-slate-500">
                {setting?.updatedAt
                  ? `${ar ? "آخر تحديث" : "Last runtime update"}: ${setting.updatedAt.toLocaleString(locale)}`
                  : "Runtime source not persisted yet"}
              </p>
            </form>
          ) : (
            <EmptyState title={copy.empty} />
          )}
        </section>
      </div>
      <details className="admin-section-card mt-5">
        <summary className="cursor-pointer list-none text-lg font-black">
          {copy.languages}
        </summary>
        <form action={saveLocalizationRuntime} className="mt-4 space-y-4">
          <input
            type="hidden"
            name="currentConfig"
            value={JSON.stringify(config)}
          />
          {config.locales.map((item) => (
            <input
              type="hidden"
              name={`translations_${item.code}`}
              value={JSON.stringify(
                item.code === "en" ? source : item.translations,
              )}
              key={item.code}
            />
          ))}
          <div className="grid gap-3 md:grid-cols-4">
            <label>
              <span className="label">Default</span>
              <select
                className="input"
                name="defaultLocale"
                defaultValue={config.defaultLocale}
              >
                {config.locales
                  .filter((item) => item.enabled && item.published)
                  .map((item) => (
                    <option value={item.code} key={item.code}>
                      {item.nativeName}
                    </option>
                  ))}
              </select>
            </label>
            <input
              className="input"
              name="newLocaleCode"
              placeholder="Code e.g. de"
              dir="ltr"
            />
            <input
              className="input"
              name="newLocaleName"
              placeholder="Language name"
            />
            <input
              className="input"
              name="newLocaleNativeName"
              placeholder="Native name"
            />
          </div>
          <label className="text-sm">
            <input type="checkbox" name="newLocaleRtl" /> New locale uses RTL
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            {config.locales.map((item) => (
              <div
                className="rounded-xl border border-white/10 p-4"
                key={item.code}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="input"
                    name={`name_${item.code}`}
                    defaultValue={item.name}
                  />
                  <input
                    className="input"
                    name={`nativeName_${item.code}`}
                    defaultValue={item.nativeName}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <span dir="ltr">{item.code.toUpperCase()}</span>
                  <label>
                    <input
                      type="checkbox"
                      name={`rtl_${item.code}`}
                      defaultChecked={item.rtl}
                      disabled={item.code === "en"}
                    />{" "}
                    RTL
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name={`enabled_${item.code}`}
                      defaultChecked={item.enabled}
                      disabled={item.code === "en"}
                    />{" "}
                    Enabled
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name={`published_${item.code}`}
                      defaultChecked={item.published}
                      disabled={item.code === "en"}
                    />{" "}
                    Published
                  </label>
                  <input
                    className="input w-20"
                    type="number"
                    name={`order_${item.code}`}
                    defaultValue={item.displayOrder}
                  />
                </div>
              </div>
            ))}
          </div>
          <button className="btn-secondary">
            {ar ? "حفظ إعدادات اللغات" : "Save language settings"}
          </button>
        </form>
      </details>
    </>
  );
}
