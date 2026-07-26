import en from "../../../../locales/en.json";
import { saveLocalizationRuntime } from "@/app/localization-actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PageHeading } from "@/components/page-heading";
import { getRuntimeLocalizationConfig } from "@/lib/localization-runtime";
import { missingTranslationKeys, sanitizeLocalizationConfig } from "@/lib/localization-policy";
import { requireAdmin } from "@/lib/session";

function flatten(value: unknown, prefix = "", result: Record<string, string> = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof item === "string") result[path] = item;
    else flatten(item, path, result);
  }
  return result;
}

export default async function AdminLocalizationPage() {
  await requireAdmin();
  const configured = await getRuntimeLocalizationConfig();
  const config = sanitizeLocalizationConfig({
    ...configured,
    locales: [
      ...configured.locales,
      ...[
        { code: "en", name: "English", nativeName: "English", rtl: false },
        { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
        { code: "fr", name: "French", nativeName: "Français", rtl: false },
      ].filter(candidate => !configured.locales.some(locale => locale.code === candidate.code))
        .map(candidate => ({ ...candidate, enabled: false, published: false, translations: {} })),
    ],
  });
  const source = flatten(en);
  return <>
    <PageHeading
      eyebrow="Platform localization"
      title="Languages and product translations"
      description="English is the canonical source. Android and other clients only expose locales that are both enabled and published here."
    />
    <form action={saveLocalizationRuntime} className="space-y-5">
      <input type="hidden" name="currentConfig" value={JSON.stringify(config)} />
      <section className="card grid gap-4 p-5 sm:grid-cols-[1fr_auto]">
        <label><span className="label">Default locale</span><select className="input" name="defaultLocale" defaultValue={config.defaultLocale}>{config.locales.filter(locale => locale.enabled && locale.published).map(locale => <option key={locale.code} value={locale.code}>{locale.nativeName} ({locale.code})</option>)}</select></label>
        <div className="self-end text-sm text-slate-500">Published version {config.translationVersion}</div>
      </section>
      {config.locales.map(locale => {
        const missing = locale.code === "en" ? 0 : missingTranslationKeys(source, locale).length;
        return <section className="card p-5" key={locale.code}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-black">{locale.nativeName} <span className="text-slate-500">({locale.code})</span></h2><p className="text-sm text-slate-500">{locale.rtl ? "RTL" : "LTR"} · {missing} missing source keys</p></div>
            <div className="flex gap-5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name={`enabled_${locale.code}`} defaultChecked={locale.enabled} disabled={locale.code === "en"} /> Enabled</label>
              <label className="flex items-center gap-2"><input type="checkbox" name={`published_${locale.code}`} defaultChecked={locale.published} disabled={locale.code === "en"} /> Published</label>
            </div>
          </div>
          <label className="mt-4 block"><span className="label">Flat translation key JSON</span><textarea className="input min-h-48 font-mono text-xs" dir="ltr" name={`translations_${locale.code}`} defaultValue={JSON.stringify(locale.code === "en" && !Object.keys(locale.translations).length ? source : locale.translations, null, 2)} /></label>
        </section>;
      })}
      <ConfirmSubmit className="btn-primary" message="Publish this localization configuration and increment its version?">Save and publish configuration</ConfirmSubmit>
    </form>
  </>;
}
