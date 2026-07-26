"use client";

import { useCallback, useEffect, useState } from "react";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";

type State = {
  readiness: { ready: boolean; draftRevision: number; lifecycle: string; access: string; issues: Array<{ code: string; messageKey: string }> };
  preview: { lifecycle:string; identity: { name: string; title: string | null; bio: string | null; imageUrl: string | null; coverUrl: string | null }; slug: string | null; access: string; modules: Array<{ key: string; visibility: string; enabled: boolean }>; fieldVisibility:Record<string,boolean>; links: Array<{ id: string; title: string; url: string }>; media:Array<{id:string;purpose:string;visibility:string;previewUrl:string}> };
  publishedRevision: { revisionNumber: number; sourceDraftRevision: number } | null;
};

export function ProfilePublishingClient({ profileId, locale }: { profileId: string; locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [slugDraft,setSlugDraft]=useState("");
  const copy = ar ? {
    title: "المعاينة والنشر", draft: "معاينة المسودة", visibility: "إتاحة الملف", public: "عام", unlisted: "غير مدرج", private: "خاص",
    review: "راجعت المعاينة وأفهم أن المحتوى الظاهر فقط سيصبح عامًا.", publish: "نشر الملف", republish: "نشر التحديث",
    pause: "إيقاف النشر", resume: "استئناف النشر", retry: "إعادة المحاولة", loading: "جارٍ تحميل المعاينة…",
    ready: "جاهز للنشر", blocked: "أكمل المتطلبات التالية", lastPublished: "آخر نسخة منشورة",
  } : {
    title: "Preview and publish", draft: "Draft preview", visibility: "Profile visibility", public: "Public", unlisted: "Unlisted", private: "Private",
    review: "I reviewed the preview and understand that only visible content will become public.", publish: "Publish profile", republish: "Publish update",
    pause: "Pause publishing", resume: "Resume publishing", retry: "Retry", loading: "Loading preview…",
    ready: "Ready to publish", blocked: "Complete these requirements", lastPublished: "Last published revision",
  };
  const slugLabel=ar?"الرابط العام":"Public slug";const saveLabel=ar?"حفظ":"Save";const friendsLabel=ar?"للأصدقاء":"Friends";
  const load = useCallback(async () => {
    setError("");
    const response = await fetch(`/api/profiles/${profileId}/publishing?locale=${locale}`, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "LOAD_FAILED");
    setState(json);setSlugDraft(json.preview.slug||"");void trackFirebaseAnalyticsEvent("profile_preview_viewed",{platform:"web"});void trackFirebaseAnalyticsEvent("publish_readiness_viewed",{platform:"web",outcome:json.readiness.ready?"ready":"blocked"});
  }, [profileId, locale]);
  useEffect(() => { load().catch((reason) => setError(reason.message)); }, [load]);
  async function action(name: "publish" | "pause" | "resume") {
    if (!state || busy) return;
    setBusy(true); setError("");if(name==="publish")void trackFirebaseAnalyticsEvent("profile_publish_started",{platform:"web"});
    try {
      const response = await fetch(`/api/profiles/${profileId}/publishing`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: name, draftRevision: state.readiness.draftRevision }) });
      const json = await response.json();
      if (!response.ok || json.ok === false) {
        if (json.readiness) setState({ ...state, readiness: json.readiness });
        throw new Error(json.error || "PUBLISH_FAILED");
      }
      setReviewed(false);
      void trackFirebaseAnalyticsEvent(name==="publish"?"profile_published":"profile_paused",{platform:"web",outcome:"success"});
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "PUBLISH_FAILED"); }
    finally { setBusy(false); }
  }
  async function setAccess(access: string) {
    if (!state || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/profiles/${profileId}/visibility`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedDraftRevision: state.readiness.draftRevision, access }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      await load();
      void trackFirebaseAnalyticsEvent("visibility_changed",{platform:"web",visibility:access});
    } catch (reason) { setError(reason instanceof Error ? reason.message : "UPDATE_FAILED"); }
    finally { setBusy(false); }
  }
  if (error && !state) return <div className="card p-6"><p className="text-red-300">{error}</p><button className="btn-secondary mt-4" onClick={() => load().catch((reason) => setError(reason.message))}>{copy.retry}</button></div>;
  if (!state) return <div className="card p-8 text-center"><span className="inline-block size-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent"/><p className="mt-3 text-sm text-slate-400">{copy.loading}</p></div>;
  const firstPublish = !state.publishedRevision;
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <section className="space-y-5">
      <div className="card p-5"><h2 className="text-lg font-bold">{copy.visibility}</h2><div className="mt-4 grid grid-cols-3 gap-2">{[["PUBLIC",copy.public],["UNLISTED",copy.unlisted],["PRIVATE",copy.private]].map(([value,label])=><button type="button" key={value} disabled={busy} onClick={()=>setAccess(value)} className={state.preview.access===value?"btn-primary":"btn-secondary"}>{label}</button>)}</div></div>
      <div className="card p-5"><label className="label">{slugLabel}</label><div className="mt-2 flex gap-2"><input className="input" dir="ltr" value={slugDraft} onChange={event=>setSlugDraft(event.target.value)}/><button type="button" className="btn-secondary" disabled={busy||slugDraft===state.preview.slug} onClick={async()=>{setBusy(true);setError("");try{const response=await fetch(`/api/profiles/${profileId}/visibility`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({expectedDraftRevision:state.readiness.draftRevision,slug:slugDraft})});const json=await response.json();if(!response.ok)throw new Error(json.error);await load()}catch(reason){setError(reason instanceof Error?reason.message:"UPDATE_FAILED")}finally{setBusy(false)}}}>{saveLabel}</button></div></div>
      <div className="card p-5"><h2 className="text-lg font-bold">{ar?"خصوصية الأقسام":"Module visibility"}</h2><div className="mt-4 space-y-3">{state.preview.modules.map(module=><div key={module.key} className="flex items-center gap-3"><span className="min-w-0 flex-1 text-sm font-semibold">{module.key}</span><select className="input max-w-36" value={module.visibility} disabled={busy} onChange={async event=>{const visibility=event.target.value;setBusy(true);try{const response=await fetch(`/api/profiles/${profileId}/visibility`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({expectedDraftRevision:state.readiness.draftRevision,module:{key:module.key,visibility}})});const json=await response.json();if(!response.ok)throw new Error(json.error);void trackFirebaseAnalyticsEvent("visibility_changed",{platform:"web",visibility,module_type:module.key});await load()}catch(reason){setError(reason instanceof Error?reason.message:"UPDATE_FAILED")}finally{setBusy(false)}}}><option value="PUBLIC">{copy.public}</option><option value="FRIENDS">{friendsLabel}</option><option value="ONLY_ME">{copy.private}</option></select></div>)}</div></div>
      <div className="card p-5"><h2 className="text-lg font-bold">{ar?"الحقول الظاهرة":"Visible fields"}</h2><div className="mt-4 grid grid-cols-2 gap-2">{Object.entries(state.preview.fieldVisibility).map(([key,visible])=><div key={key} className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm"><span>{key}</span><span className={visible?"text-emerald-300":"text-slate-500"}>{visible?copy.public:copy.private}</span></div>)}</div></div>
      {!!state.preview.media.length&&<div className="card p-5"><h2 className="text-lg font-bold">{ar?"خصوصية الصور":"Media visibility"}</h2><div className="mt-4 space-y-3">{state.preview.media.map(media=><div key={media.id} className="flex items-center gap-3"><img src={media.previewUrl} alt="" className="size-14 rounded-xl object-cover"/><span className="min-w-0 flex-1 text-sm">{media.purpose}</span><select className="input max-w-36" value={media.visibility} disabled={busy} onChange={async event=>{const visibility=event.target.value;setBusy(true);try{const response=await fetch(`/api/profiles/${profileId}/visibility`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({expectedDraftRevision:state.readiness.draftRevision,media:{id:media.id,visibility}})});const json=await response.json();if(!response.ok)throw new Error(json.error);void trackFirebaseAnalyticsEvent("visibility_changed",{platform:"web",visibility,module_type:"MEDIA"});await load()}catch(reason){setError(reason instanceof Error?reason.message:"UPDATE_FAILED")}finally{setBusy(false)}}}><option value="PUBLIC">{copy.public}</option><option value="FRIENDS">{friendsLabel}</option><option value="ONLY_ME">{copy.private}</option></select></div>)}</div></div>}
      <div className="card p-5"><h2 className="text-lg font-bold">{state.readiness.ready?copy.ready:copy.blocked}</h2>{!state.readiness.ready&&<ul className="mt-4 space-y-2 text-sm text-amber-200">{state.readiness.issues.map(issue=><li key={`${issue.code}-${issue.messageKey}`}>• {issue.code.replaceAll("_"," ")}</li>)}</ul>}{state.publishedRevision&&<p className="mt-3 text-sm text-slate-400">{copy.lastPublished}: {state.publishedRevision.revisionNumber}</p>}</div>
      {firstPublish&&<label className="card flex cursor-pointer items-start gap-3 p-5"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)} className="mt-1 size-5 accent-brand-400"/><span className="text-sm leading-6">{copy.review}</span></label>}
      {error&&<p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-3"><button className="btn-primary min-h-12 flex-1" disabled={busy||!state.readiness.ready||(firstPublish&&!reviewed)} onClick={()=>action("publish")}>{busy?"…":firstPublish?copy.publish:copy.republish}</button>{state.readiness.lifecycle==="PUBLISHED"&&<button className="btn-secondary min-h-12" disabled={busy} onClick={()=>action("pause")}>{copy.pause}</button>}{state.readiness.lifecycle==="PAUSED"&&<button className="btn-secondary min-h-12" disabled={busy} onClick={()=>action("resume")}>{copy.resume}</button>}</div>
    </section>
    <aside><p className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-400"><span>{copy.draft}</span><span className="rounded-full bg-amber-400/15 px-2 py-1 text-xs text-amber-200">{state.preview.lifecycle}</span></p><div className="overflow-hidden rounded-[2rem] border-8 border-slate-800 bg-slate-950 shadow-2xl"><div className="aspect-[9/16] overflow-y-auto">{state.preview.identity.coverUrl&&<img src={state.preview.identity.coverUrl} alt="" className="h-32 w-full object-cover"/>}<div className="p-5">{state.preview.identity.imageUrl&&<img src={state.preview.identity.imageUrl} alt="" className="-mt-14 size-24 rounded-full border-4 border-slate-950 object-cover"/>}<h1 className="mt-4 text-2xl font-black">{state.preview.identity.name}</h1>{state.preview.identity.title&&<p className="mt-1 text-brand-400">{state.preview.identity.title}</p>}{state.preview.identity.bio&&<p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-300">{state.preview.identity.bio}</p>}<div className="mt-5 space-y-2">{state.preview.links.map(link=><div key={link.id} className="rounded-xl bg-white/5 p-3 text-sm">{link.title}</div>)}</div></div></div></div></aside>
  </div>;
}
