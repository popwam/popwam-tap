import { prisma } from "@popwam/db";
import { revalidatePath } from "next/cache";
import { Globe2, Phone, Power, Search } from "lucide-react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  DashboardPageHeader,
  EmptyState,
  FilterBar,
  MetricCard,
  StatusBadge,
} from "@/components/admin-ui";
import {
  authoritativeCountryCatalog,
  isCatalogCountry,
} from "@/lib/country-catalog";
import { getI18n } from "@/lib/i18n";
import { requireAdmin } from "@/lib/session";

type Params = { q?: string; status?: string };
function localized(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {};
}

async function saveCountry(data: FormData) {
  "use server";
  const admin = await requireAdmin();
  const iso2 = String(data.get("iso2") || "")
    .trim()
    .toUpperCase();
  if (!isCatalogCountry(iso2)) throw new Error("COUNTRY_ISO2_INVALID");
  const dialCode = String(data.get("dialCode") || "").trim();
  if (!/^\+[1-9]\d{0,3}$/.test(dialCode))
    throw new Error("COUNTRY_DIAL_CODE_INVALID");
  const iso3 = String(data.get("iso3") || "")
    .trim()
    .toUpperCase();
  if (iso3 && !/^[A-Z]{3}$/.test(iso3)) throw new Error("COUNTRY_ISO3_INVALID");
  const names = {
    en: String(data.get("nameEn") || "")
      .trim()
      .slice(0, 100),
    ar: String(data.get("nameAr") || "")
      .trim()
      .slice(0, 100),
    fr: String(data.get("nameFr") || "")
      .trim()
      .slice(0, 100),
  };
  if (!names.en || !names.ar || !names.fr)
    throw new Error("COUNTRY_LOCALIZED_NAME_REQUIRED");
  const enabled = data.get("enabled") === "on";
  await prisma.$transaction([
    prisma.phoneCountryConfig.upsert({
      where: { iso2 },
      create: {
        iso2,
        iso3: iso3 || null,
        name: names.en,
        localizedNames: names,
        dialCode,
        flagEmoji: String(data.get("flagEmoji") || ""),
        phonePlaceholder:
          String(data.get("phonePlaceholder") || "").trim() || null,
        enabled,
        displayOrder: Number(data.get("displayOrder") || 0),
      },
      update: {
        iso3: iso3 || null,
        name: names.en,
        localizedNames: names,
        dialCode,
        flagEmoji: String(data.get("flagEmoji") || ""),
        phonePlaceholder:
          String(data.get("phonePlaceholder") || "").trim() || null,
        enabled,
        displayOrder: Number(data.get("displayOrder") || 0),
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        operation: "admin.country.save",
        metadata: { iso2, enabled },
      },
    }),
  ]);
  revalidatePath("/admin/countries");
  revalidatePath("/api/platform/bootstrap");
}

async function bulkCountryAvailability(data: FormData) {
  "use server";
  const admin = await requireAdmin();
  const enabled = data.get("intent") === "enable";
  const query = String(data.get("q") || "")
    .trim()
    .toLowerCase();
  const configured = await prisma.phoneCountryConfig.findMany({
    select: { iso2: true, localizedNames: true, name: true, dialCode: true },
  });
  const byIso = new Map(configured.map((item) => [item.iso2, item]));
  const targets = authoritativeCountryCatalog().filter((item) => {
    const stored = byIso.get(item.iso2);
    const local = localized(stored?.localizedNames);
    return (
      !query ||
      [
        item.iso2,
        stored?.name,
        stored?.dialCode,
        item.dialCode,
        item.names.en,
        item.names.ar,
        item.names.fr,
        local.ar,
        local.fr,
      ].some((value) => value?.toLowerCase().includes(query))
    );
  });
  if (!targets.length || targets.length > 245)
    throw new Error("COUNTRY_BULK_SCOPE_INVALID");
  await prisma.$transaction([
    ...targets.map((item, index) =>
      prisma.phoneCountryConfig.upsert({
        where: { iso2: item.iso2 },
        create: {
          iso2: item.iso2,
          name: item.names.en,
          localizedNames: item.names,
          dialCode: item.dialCode,
          flagEmoji: item.flagEmoji,
          enabled,
          displayOrder: index,
        },
        update: { enabled },
      }),
    ),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        operation: "admin.country.bulk_availability",
        metadata: { enabled, count: targets.length, query: query || null },
      },
    }),
  ]);
  revalidatePath("/admin/countries");
  revalidatePath("/api/platform/bootstrap");
}

export default async function CountriesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await requireAdmin();
  const [{ locale }, params, configured] = await Promise.all([
    getI18n(),
    searchParams,
    prisma.phoneCountryConfig.findMany(),
  ]);
  const ar = locale === "ar",
    q = params.q?.trim().toLowerCase() || "",
    status = params.status || "all";
  const copy = ar
    ? {
        eyebrow: "إعدادات المنصة",
        title: "الدول",
        description:
          "إدارة دليل الدول الكامل وتحديد الدول الظاهرة حاليًا في إعدادات POP.",
        total: "إجمالي الدليل",
        enabled: "مفعّلة",
        disabled: "غير مفعّلة",
        all: "كل الحالات",
        search: "ابحث بالاسم أو ISO أو رمز الاتصال",
        calling: "رمز الاتصال",
        save: "حفظ",
        bulkOn: "تفعيل النتائج",
        bulkOff: "تعطيل النتائج",
        empty: "لا توجد دول مطابقة",
        note: "التفعيل يجعل الدولة متاحة في Bootstrap وإعدادات الهاتف؛ لا يضيف حظر تسجيل جديدًا من تلقاء نفسه.",
      }
    : {
        eyebrow: "Platform settings",
        title: "Countries",
        description:
          "Manage the complete country catalogue and choose which countries POP currently exposes.",
        total: "Catalogue countries",
        enabled: "Enabled",
        disabled: "Disabled",
        all: "All states",
        search: "Search name, ISO, or calling code",
        calling: "Calling code",
        save: "Save",
        bulkOn: "Enable results",
        bulkOff: "Disable results",
        empty: "No matching countries",
        note: "Enabled exposes the country through Bootstrap and phone setup; it does not introduce a new registration block by itself.",
      };
  const stored = new Map(configured.map((item) => [item.iso2, item]));
  const rows = authoritativeCountryCatalog().map((base, index) => {
    const item = stored.get(base.iso2);
    const local = localized(item?.localizedNames);
    return {
      ...base,
      iso3: item?.iso3 || "",
      names: {
        en: local.en || item?.name || base.names.en,
        ar: local.ar || base.names.ar,
        fr: local.fr || base.names.fr,
      },
      dialCode: item?.dialCode || base.dialCode,
      flagEmoji: item?.flagEmoji || base.flagEmoji,
      phonePlaceholder: item?.phonePlaceholder || "",
      enabled: item?.enabled || false,
      displayOrder: item?.displayOrder ?? index,
    };
  });
  const filtered = rows.filter(
    (item) =>
      (!q ||
        [
          item.iso2,
          item.iso3,
          item.dialCode,
          item.names.en,
          item.names.ar,
          item.names.fr,
        ].some((value) => value.toLowerCase().includes(q))) &&
      (status === "all" ||
        (status === "enabled" ? item.enabled : !item.enabled)),
  );
  return (
    <>
      <DashboardPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <MetricCard title={copy.total} value={rows.length} icon={Globe2} />
        <MetricCard
          title={copy.enabled}
          value={rows.filter((item) => item.enabled).length}
          icon={Power}
          emphasis
        />
        <MetricCard
          title={copy.disabled}
          value={rows.filter((item) => !item.enabled).length}
          icon={Phone}
        />
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
            className="input md:max-w-48"
            name="status"
            defaultValue={status}
          >
            <option value="all">{copy.all}</option>
            <option value="enabled">{copy.enabled}</option>
            <option value="disabled">{copy.disabled}</option>
          </select>
          <button className="btn-secondary">{ar ? "تصفية" : "Filter"}</button>
        </FilterBar>
      </form>
      <p className="mb-4 text-xs text-slate-500">{copy.note}</p>
      <form
        action={bulkCountryAvailability}
        className="mb-4 flex flex-wrap gap-2"
      >
        <input type="hidden" name="q" value={params.q || ""} />
        <ConfirmSubmit
          className="btn-secondary"
          name="intent"
          value="enable"
          message={`${copy.bulkOn} (${filtered.length})?`}
        >
          {copy.bulkOn}
        </ConfirmSubmit>
        <ConfirmSubmit
          className="btn-secondary"
          name="intent"
          value="disable"
          message={`${copy.bulkOff} (${filtered.length})?`}
        >
          {copy.bulkOff}
        </ConfirmSubmit>
      </form>
      <div className="grid gap-3 xl:grid-cols-2">
        {filtered.map((item) => (
          <form
            action={saveCountry}
            className="admin-section-card grid gap-3 sm:grid-cols-[auto_1fr_auto]"
            key={item.iso2}
          >
            <input type="hidden" name="iso2" value={item.iso2} />
            <input type="hidden" name="flagEmoji" value={item.flagEmoji} />
            <div className="text-3xl" aria-hidden>
              {item.flagEmoji}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2>{ar ? item.names.ar : item.names.en}</h2>
                <code dir="ltr">
                  {item.iso2}
                  {item.iso3 ? ` / ${item.iso3}` : ""}
                </code>
                <StatusBadge value={item.enabled ? "ENABLED" : "DISABLED"} />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <input
                  className="input"
                  name="nameAr"
                  defaultValue={item.names.ar}
                  dir="rtl"
                  aria-label="Arabic name"
                />
                <input
                  className="input"
                  name="nameEn"
                  defaultValue={item.names.en}
                  dir="ltr"
                  aria-label="English name"
                />
                <input
                  className="input"
                  name="nameFr"
                  defaultValue={item.names.fr}
                  dir="ltr"
                  aria-label="French name"
                />
                <input
                  className="input"
                  name="iso3"
                  defaultValue={item.iso3}
                  dir="ltr"
                  placeholder="ISO-3"
                />
                <input
                  className="input"
                  name="dialCode"
                  defaultValue={item.dialCode}
                  dir="ltr"
                  aria-label={copy.calling}
                />
                <input
                  className="input"
                  name="phonePlaceholder"
                  defaultValue={item.phonePlaceholder}
                  dir="ltr"
                  placeholder="Phone format"
                />
                <input
                  type="hidden"
                  name="displayOrder"
                  value={item.displayOrder}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={item.enabled}
                />
                {copy.enabled}
              </label>
              <button className="btn-secondary">{copy.save}</button>
            </div>
          </form>
        ))}
      </div>
      {!filtered.length && (
        <div className="admin-table-shell">
          <EmptyState title={copy.empty} />
        </div>
      )}
    </>
  );
}
