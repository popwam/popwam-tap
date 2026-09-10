import { LegalDocumentStatus, LegalDocumentType, prisma } from "@popwam/db";
import { FileCheck2, Globe2, Plus } from "lucide-react";
import {
  DashboardPageHeader,
  EmptyState,
  StatusBadge,
} from "@/components/admin-ui";
import { LegalCountrySelector } from "@/components/legal-country-selector";
import { getI18n } from "@/lib/i18n";
import {
  LEGAL_COUNTRY_SETTING_KEY,
  legalCandidateTarget,
  sanitizeLegalCountryTargeting,
} from "@/lib/legal-country-policy";
import { requireAdmin } from "@/lib/session";
import { saveLegalDocument } from "./actions";

function dateInput(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default async function LegalPage() {
  await requireAdmin();
  const [{ locale }, rawDocuments, countries, targetingSetting] =
    await Promise.all([
      getI18n(),
      prisma.legalDocument.findMany({
        orderBy: [
          { documentType: "asc" },
          { locale: "asc" },
          { effectiveAt: "desc" },
        ],
      }),
      prisma.phoneCountryConfig.findMany({
        orderBy: [{ enabled: "desc" }, { name: "asc" }],
      }),
      prisma.systemSetting.findUnique({
        where: { key: LEGAL_COUNTRY_SETTING_KEY },
        select: { value: true },
      }),
    ]);
  const targeting = sanitizeLegalCountryTargeting(targetingSetting?.value);
  const documents = rawDocuments.map((document) =>
    legalCandidateTarget(document, targeting),
  );
  const ar = locale === "ar";
  const copy = ar
    ? {
        eyebrow: "إعدادات المنصة",
        title: "الاتفاقيات والسياسات",
        description:
          "إدارة النسخ القانونية واستهداف الدول مع الحفاظ على السجل والتفضيل القضائي.",
        create: "إنشاء مسودة",
        type: "النوع",
        locale: "اللغة",
        version: "الإصدار",
        status: "الحالة",
        effective: "تاريخ النفاذ",
        scope: "نطاق الدول",
        global: "عالمي / افتراضي",
        supported: "كل الدول المفعّلة",
        selected: "دول محددة",
        required: "مطلوب",
        acceptance: "يتطلب موافقة",
        save: "حفظ الوثيقة",
        empty: "لا توجد وثائق",
        override: "تجاوز قطري",
        precedence:
          "الأولوية: دولة + لغة، ثم بديل اللغة لنفس الدولة، ثم الوثيقة العالمية باللغة، ثم الإنجليزية العالمية.",
      }
    : {
        eyebrow: "Platform settings",
        title: "Agreements & policies",
        description:
          "Manage legal versions and country applicability while preserving history and deterministic jurisdiction resolution.",
        create: "Create draft",
        type: "Type",
        locale: "Locale",
        version: "Version",
        status: "Status",
        effective: "Effective date",
        scope: "Country scope",
        global: "Global / default",
        supported: "All enabled countries",
        selected: "Selected countries",
        required: "Required",
        acceptance: "Acceptance required",
        save: "Save document",
        empty: "No legal documents",
        override: "Country override",
        precedence:
          "Precedence: country + locale, country locale fallback, global locale, then global English.",
      };
  const selectorCountries = countries.map((country) => {
    const names =
      country.localizedNames &&
      typeof country.localizedNames === "object" &&
      !Array.isArray(country.localizedNames)
        ? (country.localizedNames as Record<string, string>)
        : {};
    return {
      iso2: country.iso2,
      name: (ar ? names.ar : names.en) || country.name,
      flag: country.flagEmoji || "",
      enabled: country.enabled,
    };
  });
  const editor = (document?: (typeof documents)[number]) => (
    <form
      action={saveLegalDocument}
      className="mt-4 grid gap-4"
      key={document?.id || "new"}
    >
      {document && <input type="hidden" name="id" value={document.id} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className="label">{copy.type}</span>
          <select
            className="input"
            name="documentType"
            defaultValue={document?.documentType || "TERMS"}
          >
            {Object.values(LegalDocumentType).map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">{copy.locale}</span>
          <select
            className="input"
            name="locale"
            defaultValue={document?.locale || "en"}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <label>
          <span className="label">{copy.version}</span>
          <input
            className="input"
            name="version"
            defaultValue={document?.version || "1"}
            dir="ltr"
            required
          />
        </label>
        <label>
          <span className="label">{copy.status}</span>
          <select
            className="input"
            name="status"
            defaultValue={document?.status || "DRAFT"}
          >
            {Object.values(LegalDocumentStatus).map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label">Slug</span>
          <input
            className="input"
            name="slug"
            defaultValue={document?.slug || ""}
            dir="ltr"
          />
        </label>
        <label>
          <span className="label">{copy.effective}</span>
          <input
            className="input"
            type="datetime-local"
            name="effectiveAt"
            defaultValue={dateInput(document?.effectiveAt || new Date())}
            dir="ltr"
            required
          />
        </label>
      </div>
      <label>
        <span className="label">Title</span>
        <input
          className="input"
          name="title"
          defaultValue={document?.title || ""}
          required={document?.status === "PUBLISHED"}
        />
      </label>
      <label>
        <span className="label">Content</span>
        <textarea
          className="input min-h-48"
          name="content"
          defaultValue={document?.content || ""}
          required={document?.status === "PUBLISHED"}
        />
      </label>
      <fieldset>
        <legend className="label">{copy.scope}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ["GLOBAL", copy.global],
            ["ALL_SUPPORTED", copy.supported],
            ["SELECTED", copy.selected],
          ].map(([value, label]) => (
            <label
              className="rounded-xl border border-white/10 p-3 text-sm"
              key={value}
            >
              <input
                type="radio"
                name="countryTargetMode"
                value={value}
                defaultChecked={
                  (document?.countryTargetMode || "GLOBAL") === value
                }
              />{" "}
              {label}
            </label>
          ))}
        </div>
        <div className="mt-3">
          <LegalCountrySelector
            countries={selectorCountries}
            initial={document?.countries.map((item) => item.countryIso2)}
            locale={locale}
          />
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm">
          <input
            type="checkbox"
            name="required"
            defaultChecked={document?.required ?? true}
          />{" "}
          {copy.required}
        </label>
        <label className="text-sm">
          <input
            type="checkbox"
            name="requiresAcceptance"
            defaultChecked={document?.requiresAcceptance ?? true}
          />{" "}
          {copy.acceptance}
        </label>
        <button className="btn-primary">{copy.save}</button>
      </div>
    </form>
  );
  return (
    <>
      <DashboardPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        action={
          <details className="relative">
            <summary className="btn-primary cursor-pointer list-none">
              <Plus size={16} />
              {copy.create}
            </summary>
            <div className="card absolute end-0 z-30 mt-2 w-[min(92vw,62rem)] max-h-[80vh] overflow-y-auto p-5">
              {editor()}
            </div>
          </details>
        }
      />
      <p className="mb-5 rounded-2xl border border-brand-400/20 bg-brand-500/10 p-4 text-sm text-brand-100">
        <FileCheck2 className="me-2 inline" size={17} />
        {copy.precedence}
      </p>
      <div className="space-y-3">
        {documents.map((document) => (
          <details className="admin-section-card" key={document.id}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4">
              <div>
                <p className="admin-eyebrow">
                  {document.documentType} ·{" "}
                  <span dir="ltr">v{document.version}</span>
                </p>
                <h2>
                  {document.title || document.slug || document.documentType}
                </h2>
                <p>
                  {document.locale.toUpperCase()} ·{" "}
                  {document.effectiveAt.toLocaleDateString(locale)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={document.status} />
                <StatusBadge
                  value={
                    document.countryTargetMode === "GLOBAL"
                      ? "GLOBAL"
                      : "OVERRIDE"
                  }
                />
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs">
                  <Globe2 className="me-1 inline" size={13} />
                  {document.countryTargetMode === "SELECTED"
                    ? document.countries
                        .map((item) => item.countryIso2)
                        .join(", ")
                    : document.countryTargetMode}
                </span>
              </div>
            </summary>
            {editor(document)}
          </details>
        ))}
      </div>
      {!documents.length && (
        <div className="admin-table-shell">
          <EmptyState title={copy.empty} />
        </div>
      )}
    </>
  );
}
