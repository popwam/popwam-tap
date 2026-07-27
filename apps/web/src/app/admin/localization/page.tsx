import Link from "next/link";
import en from "../../../../locales/en.json";
import { saveLocalizationRuntime, saveTranslationKey } from "@/app/localization-actions";
import { PageHeading } from "@/components/page-heading";
import { getRuntimeLocalizationConfig } from "@/lib/localization-runtime";
import { sanitizeLocalizationConfig } from "@/lib/localization-policy";
import { filterTranslationKeys, flattenTranslations, translationCoverage, translationNamespace } from "@/lib/translation-editor";
import { requireAdmin } from "@/lib/session";

type Props = { searchParams: Promise<{ key?: string; q?: string; namespace?: string; locale?: string; missing?: string }> };

export default async function AdminLocalizationPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const configured = await getRuntimeLocalizationConfig();
  const config = sanitizeLocalizationConfig(configured);
  const source = { ...flattenTranslations(en), ...config.locales.find(locale => locale.code === "en")?.translations };
  const keys = [...new Set([...Object.keys(source), ...config.locales.flatMap(locale => Object.keys(locale.translations))])].sort();
  const displayed = filterTranslationKeys(keys, source, config.locales, { query: params.q, namespace: params.namespace, locale: params.locale, incomplete: params.missing === "1" });
  const selectedKey = params.key && keys.includes(params.key) ? params.key : displayed[0] || keys[0] || "";
  const selected = selectedKey ? { key: selectedKey, english: source[selectedKey] || "", values: Object.fromEntries(config.locales.map(locale => [locale.code, locale.code === "en" ? source[selectedKey] || "" : locale.translations[selectedKey] || ""])) } : null;
  const namespaces = [...new Set(keys.map(translationNamespace))].sort();
  const listHref = (key: string) => `/admin/localization?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.namespace ? { namespace: params.namespace } : {}), ...(params.locale ? { locale: params.locale } : {}), ...(params.missing === "1" ? { missing: "1" } : {}), key }).toString()}`;
  return <>
    <PageHeading eyebrow="Platform Settings" title="Languages & translations" description="Key/value editing is the normal workflow. English is canonical; empty translations safely fall back to English." />
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {config.locales.map(locale => { const coverage = translationCoverage(keys, { ...locale, translations: locale.code === "en" ? source : locale.translations }); return <div className="card p-4" key={locale.code}><div className="flex justify-between"><b>{locale.nativeName}</b><span className="text-xs text-slate-500">{locale.code.toUpperCase()} · {locale.rtl ? "RTL" : "LTR"}</span></div><p className="mt-2 text-sm text-slate-400">{coverage.percentage}% coverage · {coverage.missing} missing</p><p className="mt-1 text-xs text-slate-500">{locale.published ? "Published" : "Draft"} · order {locale.displayOrder}</p></div>; })}
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.3fr)]">
      <section className="card p-4">
        <form className="grid gap-2 sm:grid-cols-2" method="get">
          <input className="input" name="q" defaultValue={params.q} placeholder="Search key or translated value" />
          <select className="input" name="namespace" defaultValue={params.namespace || ""}><option value="">All namespaces</option>{namespaces.map(namespace => <option key={namespace}>{namespace}</option>)}</select>
          <select className="input" name="locale" defaultValue={params.locale || ""}><option value="">Any locale</option>{config.locales.map(locale => <option key={locale.code} value={locale.code}>{locale.nativeName}</option>)}</select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="missing" value="1" defaultChecked={params.missing === "1"}/> Missing only</label>
          <button className="btn-secondary sm:col-span-2">Filter {displayed.length} keys</button>
        </form>
        <div className="mt-4 max-h-[620px] space-y-1 overflow-y-auto">
          {displayed.map(key => { const missing = config.locales.filter(locale => locale.code !== "en" && !locale.translations[key]?.trim()).length; return <Link key={key} href={listHref(key)} className={`block rounded-xl p-3 ${selectedKey === key ? "bg-brand-500/15 ring-1 ring-brand-400" : "hover:bg-white/5"}`}><div className="flex justify-between gap-3"><b className="truncate text-sm">{key}</b><span className="shrink-0 text-xs text-slate-500">{missing ? `${missing} missing` : "Complete"}</span></div><p className="mt-1 truncate text-xs text-slate-400">{source[key] || "No English source"}</p></Link>; })}
          {!displayed.length && <p className="p-4 text-sm text-slate-500">No translation keys match these filters.</p>}
        </div>
      </section>
      <section className="card p-5">
        <h2 className="text-lg font-black">{selected ? "Edit translation key" : "Add translation key"}</h2>
        <form action={saveTranslationKey} className="mt-4 space-y-4">
          <label><span className="label">Stable key</span><input className="input" name="key" defaultValue={selected?.key} placeholder="auth.continue" required /></label>
          {config.locales.map(locale => <label className="block" key={locale.code}><span className="label flex justify-between"><span>{locale.nativeName} {locale.code === "en" ? "(canonical)" : ""}</span>{locale.code !== "en" && !selected?.values[locale.code]?.trim() && <span className="text-amber-400">Falls back to English</span>}</span><textarea className="input min-h-20" name={`value_${locale.code}`} dir={locale.rtl ? "rtl" : "ltr"} defaultValue={selected?.values[locale.code] || ""} placeholder={locale.code === "en" ? "Required English source" : "Optional translation"} required={locale.code === "en"}/></label>)}
          <button className="btn-primary">Save & publish translation change</button><span className="ml-3 text-xs text-slate-500">Version {config.translationVersion} will increment.</span>
        </form>
      </section>
    </div>
    <section className="card mt-5 p-5"><h2 className="text-lg font-black">Languages</h2><p className="mt-1 text-sm text-slate-400">Add a locale or update its names, publishing, default, direction and display order. Locale rows above update automatically.</p><form action={saveLocalizationRuntime} className="mt-4 space-y-4"><input type="hidden" name="currentConfig" value={JSON.stringify(config)} />{config.locales.map(locale => <input type="hidden" key={`translations_${locale.code}`} name={`translations_${locale.code}`} value={JSON.stringify(locale.code === "en" ? source : locale.translations)} />)}<div className="grid gap-3 md:grid-cols-4"><label><span className="label">Default</span><select className="input" name="defaultLocale" defaultValue={config.defaultLocale}>{config.locales.filter(locale => locale.enabled && locale.published).map(locale => <option key={locale.code} value={locale.code}>{locale.nativeName}</option>)}</select></label><input className="input" name="newLocaleCode" placeholder="Code e.g. de"/><input className="input" name="newLocaleName" placeholder="Language name"/><input className="input" name="newLocaleNativeName" placeholder="Native name"/></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="newLocaleRtl"/> New locale uses RTL</label><div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="text-slate-400"><tr><th>Language</th><th>Native name</th><th>Code</th><th>RTL</th><th>Enabled</th><th>Published</th><th>Order</th></tr></thead><tbody>{config.locales.map(locale => <tr className="border-t border-white/10" key={locale.code}><td className="py-3"><input className="input" name={`name_${locale.code}`} defaultValue={locale.name}/></td><td><input className="input" name={`nativeName_${locale.code}`} defaultValue={locale.nativeName}/></td><td>{locale.code}</td><td><input type="checkbox" name={`rtl_${locale.code}`} defaultChecked={locale.rtl} disabled={locale.code === "en"}/></td><td><input type="checkbox" name={`enabled_${locale.code}`} defaultChecked={locale.enabled} disabled={locale.code === "en"}/></td><td><input type="checkbox" name={`published_${locale.code}`} defaultChecked={locale.published} disabled={locale.code === "en"}/></td><td><input className="input w-20" type="number" name={`order_${locale.code}`} defaultValue={locale.displayOrder}/></td></tr>)}</tbody></table></div><button className="btn-secondary">Save language configuration</button></form></section>
    <details className="card mt-5 p-5"><summary className="cursor-pointer font-bold">Advanced JSON tools</summary><p className="mt-2 text-sm text-slate-400">JSON is retained only for export/backup. Use the key/value editor above for normal translation work.</p><pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-black/20 p-3 text-xs" dir="ltr">{JSON.stringify(config, null, 2)}</pre></details>
  </>;
}
