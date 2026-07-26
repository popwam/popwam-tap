"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDown, ArrowUp, Check, ChevronDown, CircleAlert, Eye, ImagePlus, Link2,
  LoaderCircle, Pencil, Plus, RefreshCw, Save, Trash2, UserRound, X,
} from "lucide-react";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";

type Copy = Record<string, string>;
type SelectorState = {
  profiles: Array<{ id: string; label: string; publicName: string; profileKind: string; categoryKey: string | null; lifecycle: string; isPrimary: boolean }>;
  selectedProfileId: string | null;
  quota: { used: number; limit: number; remaining: number; planSlug: string; quotaAllowsAdditional: boolean; onboardingSupported: boolean; blocker: string };
};
type Module = { id: string; key: string; name: string; enabled: boolean; visibility: string; sortOrder: number; required: boolean; supported: boolean; modified: boolean };
type LinkItem = { id: string; title: string; titleAr: string; titleEn: string; type: string; url: string; visibility: string; sortOrder: number };
type ServiceItem = { id: string; name: string; nameAr: string | null; nameEn: string | null; descriptionAr: string | null; descriptionEn: string | null; url: string | null; visibility: string };
type BranchItem = { id: string; name: string; nameAr: string | null; nameEn: string | null; addressAr: string | null; addressEn: string | null; phone: string | null; mapUrl: string | null; visibility: string };
type EditorState = {
  profile: { id: string; label: string; displayLabel: string; displayName: string; profileKind: string; categoryKey: string | null; lifecycle: string; access: string; isPrimary: boolean; draftRevision: number; publishedRevision: number | null; draftChanged: boolean; changedSections: string[]; primaryLanguage: string };
  readiness: { ready: boolean; issues: Array<{ code: string; path: string; module?: string }> };
  preview: { identity: { name: string; title: string | null; bio: string | null; imageUrl: string | null; coverUrl: string | null }; links: Array<{ id: string; title: string; url: string }>; services: Array<{ id: string; name: string; description: string | null }>; branches: Array<{ id: string; name: string; address: string | null }>; media: Array<{ id: string; purpose: string; visibility: string; previewUrl: string }> };
  identity: Record<string, string>;
  about: Record<string, string>;
  contact: Record<string, string | Record<string, string>>;
  links: LinkItem[];
  services: ServiceItem[];
  branches: BranchItem[];
  media: Array<{ id: string; purpose: string; visibility: string; sortOrder: number; previewUrl: string }>;
  modules: Module[];
  addableModules: Array<{ key: string; name: string }>;
};

const socialTypes = new Set(["FACEBOOK", "LINKEDIN", "GITHUB", "TIKTOK", "INSTAGRAM", "X", "YOUTUBE", "TELEGRAM", "SOCIAL"]);
const destinationTypes = ["WEBSITE", "CUSTOM_URL", "FACEBOOK", "LINKEDIN", "INSTAGRAM", "X", "YOUTUBE", "TIKTOK", "GITHUB", "TELEGRAM", "PHONE", "EMAIL", "WHATSAPP_BUSINESS", "LOCATION"];

function value(data: FormData, key: string) { return String(data.get(key) || ""); }

function statusLabel(copy: Copy, lifecycle: string) {
  return copy[lifecycle.toLowerCase()] || lifecycle;
}

function visibilityLabel(copy: Copy, visibility: string) {
  return visibility === "PUBLIC" ? copy.public : visibility === "FRIENDS" ? copy.friends : copy.onlyMe;
}

function moduleLabel(copy: Copy, key: string, fallback: string) {
  return copy[`section${key.charAt(0)}${key.slice(1).toLowerCase()}`] || fallback;
}

function VisibilitySelect({ copy, name = "visibility", defaultValue = "ONLY_ME" }: { copy: Copy; name?: string; defaultValue?: string }) {
  return <label><span className="label">{copy.visibility}</span><select className="input" name={name} defaultValue={defaultValue}><option value="PUBLIC">{copy.public}</option><option value="FRIENDS">{copy.friends}</option><option value="ONLY_ME">{copy.onlyMe}</option></select></label>;
}

function TextField({ label, name, initial = "", dir, multiline = false, required = false }: { label: string; name: string; initial?: string | null; dir?: "ltr"; multiline?: boolean; required?: boolean }) {
  return <label><span className="label">{label}</span>{multiline
    ? <textarea className="input min-h-28" name={name} defaultValue={initial || ""} required={required}/>
    : <input className="input" name={name} defaultValue={initial || ""} dir={dir} required={required}/>}</label>;
}

function EditorDialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} onCancel={(event) => { event.preventDefault(); close(); }} className="m-auto max-h-[92vh] w-[min(44rem,calc(100%-1.5rem))] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-slate-950 p-0 text-white shadow-2xl backdrop:bg-black/70">
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/95 p-5 backdrop-blur">
      <h2 className="text-xl font-black">{title}</h2><button className="btn-secondary" onClick={close} aria-label="Close"><X size={18}/></button>
    </div>
    <div className="p-5">{children}</div>
  </dialog>;
}

function SaveButton({ copy, busy }: { copy: Copy; busy: boolean }) {
  return <button className="btn-primary min-h-12" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={17}/> : <Save size={17}/>} {busy ? copy.saving : copy.save}</button>;
}

export function ProfileHomeEditor({ locale, copy }: { locale: "ar" | "en"; copy: Copy }) {
  const [selector, setSelector] = useState<SelectorState | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<string | null>(null);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed" | "conflict">("idle");
  const [lastAction, setLastAction] = useState<Record<string, unknown> | null>(null);

  const loadEditor = useCallback(async (profileId: string) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/profiles/${profileId}/editor?locale=${locale}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "PROFILE_EDITOR_LOAD_FAILED");
      setEditor(json);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "PROFILE_EDITOR_LOAD_FAILED");
    } finally { setLoading(false); }
  }, [locale]);

  const load = useCallback(async (requested?: string | null) => {
    setLoading(true); setError("");
    try {
      const suffix = requested ? `?selected=${encodeURIComponent(requested)}` : "";
      const response = await fetch(`/api/profiles${suffix}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "PROFILE_SELECTOR_LOAD_FAILED");
      setSelector(json);
      setSelectedId(json.selectedProfileId);
      if (json.selectedProfileId) await loadEditor(json.selectedProfileId);
      else setLoading(false);
    } catch (reason) {
      setLoading(false);
      setError(reason instanceof Error ? reason.message : "PROFILE_SELECTOR_LOAD_FAILED");
    }
  }, [loadEditor]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("profile");
    void load(query);
    void trackFirebaseAnalyticsEvent("home_viewed", { platform: "web" });
  }, [load]);

  async function switchProfile(profileId: string) {
    if (profileId === selectedId) return;
    setSelectedId(profileId);
    window.history.replaceState(null, "", `/dashboard?profile=${encodeURIComponent(profileId)}`);
    const selected = selector?.profiles.find((profile) => profile.id === profileId);
    void trackFirebaseAnalyticsEvent("profile_switched", { platform: "web", profile_kind: selected?.profileKind, category_key: selected?.categoryKey || undefined });
    await loadEditor(profileId);
  }

  async function mutate(action: Record<string, unknown>) {
    if (!editor || busy) return false;
    setBusy(true); setSaveState("saving"); setLastAction(action); setError("");
    try {
      const response = await fetch(`/api/profiles/${editor.profile.id}/editor`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedDraftRevision: editor.profile.draftRevision, action }),
      });
      const json = await response.json();
      if (response.status === 409) { setSaveState("conflict"); return false; }
      if (!response.ok) throw new Error(json.error || "PROFILE_EDITOR_SAVE_FAILED");
      setSaveState("saved");
      void trackFirebaseAnalyticsEvent("profile_section_saved", { platform: "web", module_type: String(action.type || "").split("_")[0], outcome: "success" });
      await loadEditor(editor.profile.id);
      return true;
    } catch (reason) {
      setSaveState("failed");
      setError(reason instanceof Error ? reason.message : "PROFILE_EDITOR_SAVE_FAILED");
      return false;
    } finally { setBusy(false); }
  }

  async function uploadMedia(file: File) {
    if (!editor || busy) return;
    setBusy(true); setSaveState("saving");
    try {
      const data = new FormData();
      data.set("purpose", "GALLERY"); data.set("file", file);
      data.set("expectedDraftRevision", String(editor.profile.draftRevision));
      const response = await fetch(`/api/profiles/${editor.profile.id}/media`, { method: "POST", body: data });
      const json = await response.json();
      if (response.status === 409) { setSaveState("conflict"); return; }
      if (!response.ok) throw new Error(json.error || "MEDIA_UPLOAD_FAILED");
      setSaveState("saved");
      void trackFirebaseAnalyticsEvent("draft_media_uploaded", { platform: "web", module_type: "GALLERY", outcome: "success" });
      await loadEditor(editor.profile.id);
    } catch (reason) {
      setSaveState("failed"); setError(reason instanceof Error ? reason.message : "MEDIA_UPLOAD_FAILED");
    } finally { setBusy(false); }
  }

  async function removeMedia(mediaId: string) {
    if (!editor || busy) return;
    setBusy(true); setSaveState("saving");
    try {
      const response = await fetch(`/api/profiles/${editor.profile.id}/media/${mediaId}?expectedDraftRevision=${editor.profile.draftRevision}`, { method: "DELETE" });
      const json = await response.json();
      if (response.status === 409) { setSaveState("conflict"); return; }
      if (!response.ok) throw new Error(json.error || "MEDIA_REMOVE_FAILED");
      setSaveState("saved"); await loadEditor(editor.profile.id);
    } catch (reason) {
      setSaveState("failed"); setError(reason instanceof Error ? reason.message : "MEDIA_REMOVE_FAILED");
    } finally { setBusy(false); }
  }

  const orderedModules = useMemo(() => [...(editor?.modules || [])].sort((a, b) => a.sortOrder - b.sortOrder), [editor?.modules]);
  const activeModule = editor?.modules.find((module) => module.key === activeEditor);

  if (loading && !editor) return <div className="card flex min-h-80 items-center justify-center p-8" role="status"><LoaderCircle className="animate-spin text-brand-400"/><span className="ms-3">{copy.loading}</span></div>;
  if (error && !editor) return <div className="card p-8 text-center"><CircleAlert className="mx-auto text-red-300"/><p className="mt-3">{copy.loadFailed}</p><button className="btn-secondary mt-5" onClick={() => void load(selectedId)}><RefreshCw size={16}/>{copy.retry}</button></div>;
  if (!selector?.profiles.length || !editor) return <div className="card p-8 text-center">{copy.empty}</div>;

  const saveBanner = saveState === "saving" ? copy.saving : saveState === "saved" ? copy.saved : saveState === "failed" ? copy.failed : saveState === "conflict" ? copy.conflict : "";
  return <div className="space-y-6">
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-brand-400">{copy.eyebrow}</p><h1 className="mt-2 text-3xl font-black">{copy.title}</h1><p className="mt-2 max-w-2xl text-slate-400">{copy.description}</p></div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/profile/publish?profile=${encodeURIComponent(editor.profile.id)}`} className="btn-secondary" onClick={() => void trackFirebaseAnalyticsEvent("profile_preview_opened", { platform: "web" })}><Eye size={17}/>{copy.preview}</Link>
        <Link href={`/dashboard/profile/publish?profile=${encodeURIComponent(editor.profile.id)}`} className="btn-primary" onClick={() => void trackFirebaseAnalyticsEvent("publish_review_opened", { platform: "web" })}>{copy.publishChanges}</Link>
      </div>
    </header>

    <section className="card p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label><span className="label">{copy.selectProfile}</span><div className="relative"><select className="input appearance-none pe-10" value={selectedId || ""} onChange={(event) => void switchProfile(event.target.value)}>
          {selector.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label} · {profile.isPrimary ? copy.primary : profile.profileKind === "BUSINESS" ? copy.business : copy.personal} · {statusLabel(copy, profile.lifecycle)}</option>)}
        </select><ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-500" size={17}/></div></label>
        <button className="btn-secondary min-h-12" onClick={() => { setAddProfileOpen(true); void trackFirebaseAnalyticsEvent("add_profile_started", { platform: "web", outcome: selector.quota.quotaAllowsAdditional ? "available" : "limit_reached" }); }}><Plus size={17}/>{copy.addProfile}</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {editor.profile.isPrimary && <span className="rounded-full bg-brand-400/15 px-3 py-1 font-bold text-brand-300">{copy.primary}</span>}
        <span className="rounded-full bg-white/5 px-3 py-1">{editor.profile.profileKind === "BUSINESS" ? copy.business : copy.personal}</span>
        <span className={`rounded-full px-3 py-1 font-bold ${editor.profile.lifecycle === "PAUSED" ? "bg-amber-400/15 text-amber-200" : "bg-emerald-400/10 text-emerald-300"}`}>{statusLabel(copy, editor.profile.lifecycle)}</span>
        {editor.profile.draftChanged && <span className="rounded-full bg-violet-400/15 px-3 py-1 font-bold text-violet-200">{copy.draftChanges}</span>}
      </div>
      {editor.profile.lifecycle === "PAUSED" && <p className="mt-4 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">{copy.publicUnavailable}</p>}
    </section>

    {saveBanner && <div className={`flex items-center justify-between rounded-xl p-3 text-sm ${saveState === "saved" ? "bg-emerald-400/10 text-emerald-300" : saveState === "saving" ? "bg-brand-400/10 text-brand-300" : "bg-red-400/10 text-red-200"}`} role="status" aria-live="polite">
      <span className="flex items-center gap-2">{saveState === "saving" ? <LoaderCircle className="animate-spin" size={16}/> : saveState === "saved" ? <Check size={16}/> : <CircleAlert size={16}/>} {saveBanner}</span>
      {saveState === "conflict" ? <button className="btn-secondary" onClick={() => void loadEditor(editor.profile.id)}>{copy.refresh}</button> : saveState === "failed" && lastAction ? <button className="btn-secondary" onClick={() => void mutate(lastAction)}>{copy.retry}</button> : null}
    </div>}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <main className="space-y-5">
        <section className="card p-5">
          <div className="flex items-center justify-between"><div><h2 className="text-xl font-black">{copy.sections}</h2><p className="mt-1 text-sm text-slate-500">{editor.profile.draftChanged ? copy.draftChanges : copy.saved}</p></div></div>
          <div className="mt-5 space-y-3">
            {orderedModules.map((module, index) => <div key={module.id} className={`rounded-2xl border p-4 ${module.enabled ? "border-white/10 bg-white/[.025]" : "border-white/5 opacity-70"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <button className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => { setActiveEditor(module.key); void trackFirebaseAnalyticsEvent("profile_edit_started", { platform: "web", module_type: module.key }); }}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-400/10 text-brand-300"><Pencil size={17}/></span>
                  <span className="min-w-0"><span className="block truncate font-bold">{moduleLabel(copy, module.key, module.name)}</span><span className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">{module.required && <span>{copy.required}</span>}{module.modified && <span className="text-violet-300">{copy.modified}</span>}{!module.supported && <span>{copy.unsupported}</span>}</span></span>
                </button>
                <select aria-label={`${module.name} ${copy.visibility}`} className="input w-auto min-w-28" value={module.visibility} disabled={busy || !module.enabled} onChange={(event) => { void mutate({ type: "MODULE_UPDATE", key: module.key, visibility: event.target.value, enabled: module.enabled }); void trackFirebaseAnalyticsEvent("profile_visibility_changed", { platform: "web", module_type: module.key, visibility: event.target.value }); }}>
                  <option value="PUBLIC">{copy.public}</option><option value="FRIENDS">{copy.friends}</option><option value="ONLY_ME">{copy.onlyMe}</option>
                </select>
                <div className="flex gap-1">
                  <button className="btn-secondary px-2" aria-label={copy.moveUp} disabled={busy || index === 0} onClick={() => { const keys = orderedModules.map((item) => item.key); [keys[index - 1], keys[index]] = [keys[index], keys[index - 1]]; void mutate({ type: "MODULE_REORDER", keys }); }}><ArrowUp size={15}/></button>
                  <button className="btn-secondary px-2" aria-label={copy.moveDown} disabled={busy || index === orderedModules.length - 1} onClick={() => { const keys = orderedModules.map((item) => item.key); [keys[index + 1], keys[index]] = [keys[index], keys[index + 1]]; void mutate({ type: "MODULE_REORDER", keys }); }}><ArrowDown size={15}/></button>
                  <button className="btn-secondary" disabled={busy || (module.required && module.enabled)} onClick={() => void mutate({ type: "MODULE_UPDATE", key: module.key, enabled: !module.enabled, visibility: module.visibility })}>{module.enabled ? copy.disable : copy.enable}</button>
                </div>
              </div>
            </div>)}
          </div>
          {!!editor.addableModules.length && <details className="mt-4 rounded-2xl border border-dashed border-white/15 p-4"><summary className="cursor-pointer font-bold"><Plus className="me-2 inline" size={17}/>{copy.addSection}</summary><div className="mt-4 flex flex-wrap gap-2">{editor.addableModules.map((module) => <button className="btn-secondary" key={module.key} disabled={busy} onClick={() => { void mutate({ type: "MODULE_ADD", key: module.key }); void trackFirebaseAnalyticsEvent("profile_module_added", { platform: "web", module_type: module.key }); }}>{moduleLabel(copy, module.key, module.name)}</button>)}</div></details>}
        </section>

        <section className="card p-5">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">{editor.readiness.ready ? copy.ready : `${editor.readiness.issues.length} ${copy.finishItems}`}</h2><p className="mt-2 text-sm text-slate-500">{copy.reviewPublish}</p></div><span className={`size-3 rounded-full ${editor.readiness.ready ? "bg-emerald-400" : "bg-amber-400"}`}/></div>
          {!editor.readiness.ready && <ul className="mt-4 space-y-2">{editor.readiness.issues.map((issue) => <li key={`${issue.code}-${issue.path}`}><button className="w-full rounded-xl bg-amber-400/5 p-3 text-start text-sm text-amber-100 hover:bg-amber-400/10" onClick={() => setActiveEditor(issue.module || (issue.path.includes("displayName") ? "IDENTITY" : issue.path.includes("access") || issue.path.includes("slug") ? null : "ABOUT"))}>{issue.code.replaceAll("_", " ")}</button></li>)}</ul>}
          <div className="mt-5 flex flex-wrap gap-2"><Link href={`/dashboard/profile/publish?profile=${encodeURIComponent(editor.profile.id)}`} className="btn-secondary"><Eye size={16}/>{copy.preview}</Link><Link href={`/dashboard/profile/publish?profile=${encodeURIComponent(editor.profile.id)}`} className={`btn-primary ${!editor.readiness.ready ? "pointer-events-none opacity-50" : ""}`} aria-disabled={!editor.readiness.ready}>{copy.publishChanges}</Link></div>
        </section>
      </main>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <p className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-400"><span>{copy.preview}</span><span>{copy.draft}</span></p>
        <div className="overflow-hidden rounded-[2rem] border-8 border-slate-800 bg-slate-950 shadow-2xl">
          <div className="aspect-[9/16] overflow-y-auto">
            {editor.preview.identity.coverUrl && <img src={editor.preview.identity.coverUrl} alt="" className="h-28 w-full object-cover"/>}
            <div className="p-5">
              {editor.preview.identity.imageUrl ? <img src={editor.preview.identity.imageUrl} alt="" className="-mt-12 size-20 rounded-full border-4 border-slate-950 object-cover"/> : <div className="flex size-20 items-center justify-center rounded-full bg-brand-400/15"><UserRound/></div>}
              <h2 className="mt-4 text-2xl font-black">{editor.preview.identity.name}</h2>
              {editor.preview.identity.title && <p className="mt-1 text-brand-300">{editor.preview.identity.title}</p>}
              {editor.preview.identity.bio && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-300">{editor.preview.identity.bio}</p>}
              {!!editor.preview.links.length && <div className="mt-5 space-y-2">{editor.preview.links.map((link) => <div className="rounded-xl bg-white/5 p-3 text-sm" key={link.id}>{link.title}</div>)}</div>}
              {!!editor.preview.services.length && <div className="mt-5"><h3 className="font-bold">{copy.sectionServices}</h3>{editor.preview.services.map((service) => <div className="mt-2 rounded-xl bg-white/5 p-3 text-sm" key={service.id}>{service.name}</div>)}</div>}
              {!!editor.preview.branches.length && <div className="mt-5"><h3 className="font-bold">{copy.sectionBranches}</h3>{editor.preview.branches.map((branch) => <div className="mt-2 rounded-xl bg-white/5 p-3 text-sm" key={branch.id}>{branch.name}</div>)}</div>}
            </div>
          </div>
        </div>
      </aside>
    </div>

    {addProfileOpen && <EditorDialog title={copy.addProfile} close={() => setAddProfileOpen(false)}>
      <div className="rounded-2xl bg-white/5 p-5"><p className="text-lg font-bold">{selector.quota.used} / {selector.quota.limit} {copy.quota}</p><p className="mt-2 text-sm text-slate-400">{selector.quota.quotaAllowsAdditional ? copy.quotaAvailable : copy.quotaReached}</p></div>
      <p className="mt-4 rounded-2xl bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">{copy.quotaProgressBlocker}</p>
      <div className="mt-5 flex gap-2"><Link href="/dashboard/plans" className="btn-primary">{copy.upgrade}</Link><button className="btn-secondary" onClick={() => setAddProfileOpen(false)}>{copy.close}</button></div>
    </EditorDialog>}

    {activeEditor && <EditorDialog title={moduleLabel(copy, activeEditor, activeModule?.name || activeEditor)} close={() => setActiveEditor(null)}>
      {!activeModule?.supported ? <p className="rounded-xl bg-amber-400/10 p-4 text-amber-100">{copy.unsupported}</p>
        : activeEditor === "IDENTITY" ? <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutate({ type: "IDENTITY_SAVE", displayLabel: value(data, "displayLabel"), displayName: value(data, "displayName"), displayNameAr: value(data, "displayNameAr"), displayNameEn: value(data, "displayNameEn"), jobTitleAr: value(data, "jobTitleAr"), jobTitleEn: value(data, "jobTitleEn"), organizationNameAr: value(data, "displayNameAr"), organizationNameEn: value(data, "displayNameEn"), primaryLanguage: editor.profile.primaryLanguage }).then((ok) => { if (ok) setActiveEditor(null); }); }}>
          <TextField label={copy.selectorLabel} name="displayLabel" initial={editor.identity.displayLabel}/><TextField label={copy.name} name="displayName" initial={editor.identity.displayName} required/><TextField label={copy.arabicName} name="displayNameAr" initial={editor.identity.displayNameAr}/><TextField label={copy.englishName} name="displayNameEn" initial={editor.identity.displayNameEn}/><TextField label={copy.arabicTitle} name="jobTitleAr" initial={editor.identity.jobTitleAr}/><TextField label={copy.englishTitle} name="jobTitleEn" initial={editor.identity.jobTitleEn}/><div className="sm:col-span-2"><SaveButton copy={copy} busy={busy}/></div>
        </form>
          : activeEditor === "ABOUT" ? <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutate({ type: "ABOUT_SAVE", title: value(data, "title"), bio: value(data, "bio"), bioAr: value(data, "bioAr"), bioEn: value(data, "bioEn"), descriptionAr: value(data, "bioAr"), descriptionEn: value(data, "bioEn") }).then((ok) => { if (ok) setActiveEditor(null); }); }}>
            <TextField label={copy.titleField} name="title" initial={editor.about.title}/><TextField label={copy.bio} name="bio" initial={editor.about.bio} multiline/><TextField label={copy.arabicBio} name="bioAr" initial={editor.profile.profileKind === "BUSINESS" ? editor.about.descriptionAr : editor.about.bioAr} multiline/><TextField label={copy.englishBio} name="bioEn" initial={editor.profile.profileKind === "BUSINESS" ? editor.about.descriptionEn : editor.about.bioEn} multiline/><SaveButton copy={copy} busy={busy}/>
          </form>
            : activeEditor === "CONTACT" ? <ContactEditor editor={editor} copy={copy} busy={busy} submit={(action) => void mutate(action).then((ok) => { if (ok) setActiveEditor(null); })}/>
              : activeEditor === "LINKS" || activeEditor === "SOCIAL" || activeEditor === "PORTFOLIO" ? <LinksEditor editor={editor} copy={copy} busy={busy} moduleKey={activeEditor} mutate={mutate}/>
                : activeEditor === "SERVICES" ? <ServicesEditor editor={editor} copy={copy} busy={busy} mutate={mutate}/>
                  : activeEditor === "BRANCHES" ? <BranchesEditor editor={editor} copy={copy} busy={busy} mutate={mutate}/>
                    : activeEditor === "GALLERY" ? <GalleryEditor editor={editor} copy={copy} busy={busy} uploadMedia={uploadMedia} removeMedia={removeMedia} mutate={mutate}/>
                      : <p className="rounded-xl bg-amber-400/10 p-4 text-amber-100">{copy.unsupported}</p>}
    </EditorDialog>}
  </div>;
}

function ContactEditor({ editor, copy, busy, submit }: { editor: EditorState; copy: Copy; busy: boolean; submit: (action: Record<string, unknown>) => void }) {
  const contact = editor.contact;
  const visibility = contact.visibility as Record<string, string>;
  return <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    submit({ type: "CONTACT_SAVE", phone: value(data, "phone"), alternatePhone: value(data, "alternatePhone"), email: value(data, "email"), website: value(data, "website"), whatsappBusiness: value(data, "whatsappBusiness"), whatsappPrivate: value(data, "whatsappPrivate"), locationText: value(data, "locationText"), addressAr: value(data, "addressAr"), addressEn: value(data, "addressEn"), visibility: { phone: value(data, "phoneVisibility"), email: value(data, "emailVisibility"), website: value(data, "websiteVisibility"), whatsappBusiness: value(data, "whatsappBusinessVisibility"), whatsappPrivate: value(data, "whatsappPrivateVisibility"), location: value(data, "locationVisibility") } });
  }}>
    <TextField label={copy.phone} name="phone" initial={contact.phone as string} dir="ltr"/><VisibilitySelect copy={copy} name="phoneVisibility" defaultValue={visibility.phone}/>
    <TextField label={copy.alternatePhone} name="alternatePhone" initial={contact.alternatePhone as string} dir="ltr"/><span/>
    <TextField label={copy.email} name="email" initial={contact.email as string} dir="ltr"/><VisibilitySelect copy={copy} name="emailVisibility" defaultValue={visibility.email}/>
    <TextField label={copy.website} name="website" initial={contact.website as string} dir="ltr"/><VisibilitySelect copy={copy} name="websiteVisibility" defaultValue={visibility.website}/>
    <TextField label={copy.whatsappBusiness} name="whatsappBusiness" initial={contact.whatsappBusiness as string} dir="ltr"/><VisibilitySelect copy={copy} name="whatsappBusinessVisibility" defaultValue={visibility.whatsappBusiness}/>
    <TextField label={copy.whatsappPrivate} name="whatsappPrivate" initial={contact.whatsappPrivate as string} dir="ltr"/><VisibilitySelect copy={copy} name="whatsappPrivateVisibility" defaultValue={visibility.whatsappPrivate}/>
    <TextField label={copy.location} name="locationText" initial={contact.locationText as string}/><VisibilitySelect copy={copy} name="locationVisibility" defaultValue={visibility.location}/>
    <TextField label={copy.arabicAddress} name="addressAr" initial={contact.addressAr as string}/><TextField label={copy.englishAddress} name="addressEn" initial={contact.addressEn as string}/>
    <div className="sm:col-span-2"><SaveButton copy={copy} busy={busy}/></div>
  </form>;
}

function LinksEditor({ editor, copy, busy, moduleKey, mutate }: { editor: EditorState; copy: Copy; busy: boolean; moduleKey: string; mutate: (action: Record<string, unknown>) => Promise<boolean> }) {
  const links = editor.links.filter((item) => moduleKey === "SOCIAL" ? socialTypes.has(item.type) : moduleKey === "PORTFOLIO" ? ["WEBSITE", "CUSTOM_URL"].includes(item.type) : !socialTypes.has(item.type));
  return <div className="space-y-5">
    {moduleKey === "SOCIAL" && <div className="rounded-xl bg-white/5 p-4"><p className="font-bold">{copy.connectedAccounts}</p><p className="mt-1 text-sm text-slate-400">{copy.connectAccountHelp}</p><Link className="btn-secondary mt-3" href="/dashboard/integrations"><Link2 size={16}/>{copy.connectedAccounts}</Link></div>}
    {moduleKey === "PORTFOLIO" && <p className="rounded-xl bg-white/5 p-4 text-sm text-slate-300">{copy.portfolioHelp}</p>}
    {!links.length && <p className="rounded-xl bg-white/5 p-5 text-center text-slate-400">{copy.noLinks}</p>}
    {links.map((item) => <form key={item.id} className="grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutate({ type: "LINK_UPSERT", id: item.id, title: value(data, "title"), titleAr: value(data, "titleAr"), titleEn: value(data, "titleEn"), destinationType: value(data, "destinationType"), url: value(data, "url"), visibility: value(data, "visibility") }); }}>
      <TextField label={copy.linkTitle} name="title" initial={item.title} required/><label><span className="label">{copy.linkType}</span><select className="input" name="destinationType" defaultValue={item.type}>{destinationTypes.map((type) => <option key={type}>{type}</option>)}</select></label><TextField label={copy.arabicName} name="titleAr" initial={item.titleAr}/><TextField label={copy.englishName} name="titleEn" initial={item.titleEn}/><TextField label={copy.url} name="url" initial={item.url} dir="ltr" required/><VisibilitySelect copy={copy} defaultValue={item.visibility}/><div className="flex gap-2 sm:col-span-2"><SaveButton copy={copy} busy={busy}/><button type="button" className="btn-danger" disabled={busy} onClick={() => void mutate({ type: "LINK_DELETE", id: item.id })}><Trash2 size={16}/>{copy.remove}</button></div>
    </form>)}
    <form className="grid gap-3 rounded-2xl border border-dashed border-white/15 p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void mutate({ type: "LINK_UPSERT", title: value(data, "title"), titleAr: value(data, "titleAr"), titleEn: value(data, "titleEn"), destinationType: value(data, "destinationType"), url: value(data, "url"), visibility: value(data, "visibility") }).then((ok) => { if (ok) form.reset(); }); }}>
      <h3 className="font-bold sm:col-span-2">{copy.addLink}</h3><TextField label={copy.linkTitle} name="title" required/><label><span className="label">{copy.linkType}</span><select className="input" name="destinationType" defaultValue={moduleKey === "SOCIAL" ? "INSTAGRAM" : "WEBSITE"}>{destinationTypes.map((type) => <option key={type}>{type}</option>)}</select></label><TextField label={copy.arabicName} name="titleAr"/><TextField label={copy.englishName} name="titleEn"/><TextField label={copy.url} name="url" dir="ltr" required/><VisibilitySelect copy={copy}/><div className="sm:col-span-2"><SaveButton copy={copy} busy={busy}/></div>
    </form>
  </div>;
}

function ServicesEditor({ editor, copy, busy, mutate }: { editor: EditorState; copy: Copy; busy: boolean; mutate: (action: Record<string, unknown>) => Promise<boolean> }) {
  return <div className="space-y-4">
    {!editor.services.length && <p className="rounded-xl bg-white/5 p-5 text-center text-slate-400">{copy.noServices}</p>}
    {editor.services.map((item) => <form key={item.id} className="grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutate({ type: "SERVICE_UPSERT", id: item.id, nameAr: value(data, "nameAr"), nameEn: value(data, "nameEn"), descriptionAr: value(data, "descriptionAr"), descriptionEn: value(data, "descriptionEn"), url: value(data, "url"), visibility: value(data, "visibility") }); }}>
      <TextField label={copy.serviceNameAr} name="nameAr" initial={item.nameAr}/><TextField label={copy.serviceNameEn} name="nameEn" initial={item.nameEn}/><TextField label={copy.descriptionAr} name="descriptionAr" initial={item.descriptionAr} multiline/><TextField label={copy.descriptionEn} name="descriptionEn" initial={item.descriptionEn} multiline/><TextField label={copy.url} name="url" initial={item.url} dir="ltr"/><VisibilitySelect copy={copy} defaultValue={item.visibility}/><div className="flex gap-2 sm:col-span-2"><SaveButton copy={copy} busy={busy}/><button type="button" className="btn-danger" onClick={() => void mutate({ type: "SERVICE_DELETE", id: item.id })}><Trash2 size={16}/>{copy.remove}</button></div>
    </form>)}
    <form className="grid gap-3 rounded-2xl border border-dashed border-white/15 p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void mutate({ type: "SERVICE_UPSERT", nameAr: value(data, "nameAr"), nameEn: value(data, "nameEn"), descriptionAr: value(data, "descriptionAr"), descriptionEn: value(data, "descriptionEn"), url: value(data, "url"), visibility: value(data, "visibility") }).then((ok) => { if (ok) form.reset(); }); }}>
      <h3 className="font-bold sm:col-span-2">{copy.addService}</h3><TextField label={copy.serviceNameAr} name="nameAr"/><TextField label={copy.serviceNameEn} name="nameEn"/><TextField label={copy.descriptionAr} name="descriptionAr" multiline/><TextField label={copy.descriptionEn} name="descriptionEn" multiline/><TextField label={copy.url} name="url" dir="ltr"/><VisibilitySelect copy={copy}/><div className="sm:col-span-2"><SaveButton copy={copy} busy={busy}/></div>
    </form>
  </div>;
}

function BranchesEditor({ editor, copy, busy, mutate }: { editor: EditorState; copy: Copy; busy: boolean; mutate: (action: Record<string, unknown>) => Promise<boolean> }) {
  return <div className="space-y-4">
    {!editor.branches.length && <p className="rounded-xl bg-white/5 p-5 text-center text-slate-400">{copy.noBranches}</p>}
    {editor.branches.map((item) => <form key={item.id} className="grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutate({ type: "BRANCH_UPSERT", id: item.id, nameAr: value(data, "nameAr"), nameEn: value(data, "nameEn"), addressAr: value(data, "addressAr"), addressEn: value(data, "addressEn"), phone: value(data, "phone"), mapUrl: value(data, "mapUrl"), visibility: value(data, "visibility") }); }}>
      <TextField label={copy.branchNameAr} name="nameAr" initial={item.nameAr}/><TextField label={copy.branchNameEn} name="nameEn" initial={item.nameEn}/><TextField label={copy.arabicAddress} name="addressAr" initial={item.addressAr}/><TextField label={copy.englishAddress} name="addressEn" initial={item.addressEn}/><TextField label={copy.phone} name="phone" initial={item.phone} dir="ltr"/><TextField label={copy.mapUrl} name="mapUrl" initial={item.mapUrl} dir="ltr"/><VisibilitySelect copy={copy} defaultValue={item.visibility}/><div className="flex gap-2 sm:col-span-2"><SaveButton copy={copy} busy={busy}/><button type="button" className="btn-danger" onClick={() => void mutate({ type: "BRANCH_DELETE", id: item.id })}><Trash2 size={16}/>{copy.remove}</button></div>
    </form>)}
    <form className="grid gap-3 rounded-2xl border border-dashed border-white/15 p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void mutate({ type: "BRANCH_UPSERT", nameAr: value(data, "nameAr"), nameEn: value(data, "nameEn"), addressAr: value(data, "addressAr"), addressEn: value(data, "addressEn"), phone: value(data, "phone"), mapUrl: value(data, "mapUrl"), visibility: value(data, "visibility") }).then((ok) => { if (ok) form.reset(); }); }}>
      <h3 className="font-bold sm:col-span-2">{copy.addBranch}</h3><TextField label={copy.branchNameAr} name="nameAr"/><TextField label={copy.branchNameEn} name="nameEn"/><TextField label={copy.arabicAddress} name="addressAr"/><TextField label={copy.englishAddress} name="addressEn"/><TextField label={copy.phone} name="phone" dir="ltr"/><TextField label={copy.mapUrl} name="mapUrl" dir="ltr"/><VisibilitySelect copy={copy}/><div className="sm:col-span-2"><SaveButton copy={copy} busy={busy}/></div>
    </form>
  </div>;
}

function GalleryEditor({ editor, copy, busy, uploadMedia, removeMedia, mutate }: { editor: EditorState; copy: Copy; busy: boolean; uploadMedia: (file: File) => Promise<void>; removeMedia: (id: string) => Promise<void>; mutate: (action: Record<string, unknown>) => Promise<boolean> }) {
  return <div className="space-y-4">
    <p className="rounded-xl bg-brand-400/10 p-4 text-sm text-brand-200">{copy.mediaPrivate}</p>
    {!editor.media.length && <p className="rounded-xl bg-white/5 p-5 text-center text-slate-400">{copy.noMedia}</p>}
    <div className="grid gap-3 sm:grid-cols-2">{editor.media.map((item, index) => <div className="rounded-2xl border border-white/10 p-3" key={item.id}><img src={item.previewUrl} alt="" className="aspect-video w-full rounded-xl object-cover"/><div className="mt-3 flex gap-2"><select className="input min-w-0 flex-1" value={item.visibility} disabled={busy} onChange={(event) => void mutate({ type: "MEDIA_VISIBILITY", id: item.id, visibility: event.target.value })}><option value="PUBLIC">{copy.public}</option><option value="FRIENDS">{copy.friends}</option><option value="ONLY_ME">{copy.onlyMe}</option></select><button className="btn-secondary px-2" disabled={busy || index === 0} aria-label={copy.moveUp} onClick={() => { const ids = editor.media.map((media) => media.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; void mutate({ type: "MEDIA_REORDER", ids }); }}><ArrowUp size={15}/></button><button className="btn-secondary px-2" disabled={busy || index === editor.media.length - 1} aria-label={copy.moveDown} onClick={() => { const ids = editor.media.map((media) => media.id); [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]]; void mutate({ type: "MEDIA_REORDER", ids }); }}><ArrowDown size={15}/></button><button className="btn-danger px-3" onClick={() => void removeMedia(item.id)} aria-label={copy.remove}><Trash2 size={16}/></button></div></div>)}</div>
    <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 p-5 text-center"><ImagePlus className="text-brand-300"/><span className="mt-2 font-bold">{copy.addPhoto}</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadMedia(file); }}/></label>
  </div>;
}
