"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check, CircleAlert, Clipboard, Copy, CreditCard, ExternalLink, Nfc,
  LoaderCircle, Pause, Play, QrCode, ScanLine, Share2, ShieldCheck, X,
} from "lucide-react";
import { ActivationScanner } from "./activation-scanner";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";

type CopyText = Record<string, string>;
type Profile = { id: string; label: string; publicName: string; profileKind: string; lifecycle: string; isPrimary: boolean };
type Selector = { profiles: Profile[]; selectedProfileId: string | null };
type Target = { id: string; type: "PROFILE" | "CONTACT" | "LINK" | "SOCIAL"; label: string; canonicalUrl: string; hceCompatible: boolean; destinationType?: string };
type TargetResponse = { ok: boolean; profile: { id: string; label: string; lifecycle: string }; shareable: boolean; reason: string | null; targets: Target[]; error?: string };
type Product = {
  id: string; label: string; maskedSerial: string; productType: string; status: string; assignmentStatus: string; activationState: string;
  permanentUrl: string; profile: null | { id: string; label: string; profileKind: string; lifecycle: string };
  shareTarget: null | { id: string; label: string; type: string }; openCount: number; lastOpenedAt: string | null;
  capabilities: { targetChange: boolean; pause: boolean; resume: boolean; lostAndTransferInProductDetails: boolean };
};
type Inspect = {
  ok: boolean; eligible?: boolean; nextAction?: string; identifier?: string; retryAt?: string; legacyUrl?: string;
  product?: { label: string; maskedSerial: string; productType: string }; error?: string;
};

function Dialog({ title, close, children, wide = false }: { title: string; close: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => { if (ref.current?.open) ref.current.close(); }; }, []);
  return <dialog ref={ref} onCancel={(event) => { event.preventDefault(); close(); }} className={`m-auto max-h-[94vh] ${wide ? "w-[min(58rem,calc(100%-1.25rem))]" : "w-[min(40rem,calc(100%-1.25rem))]"} overflow-y-auto rounded-[1.75rem] border border-white/10 bg-slate-950 p-0 text-white shadow-2xl backdrop:bg-black/75`}>
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/95 p-5 backdrop-blur">
      <h2 className="text-xl font-black">{title}</h2>
      <button className="btn-secondary p-2" type="button" onClick={close} aria-label={title}><X size={18}/></button>
    </header>
    <div className="p-5">{children}</div>
  </dialog>;
}

function productType(copy: CopyText, value: string) {
  return copy[`product_${value.toLowerCase()}`] || copy.product;
}

function productStatus(copy: CopyText, value: string) {
  return copy[`status_${value.toLowerCase()}`] || value;
}

export function ShareCenter({ locale, copy }: { locale: "ar" | "en"; copy: CopyText }) {
  const [selector, setSelector] = useState<Selector | null>(null);
  const [profileId, setProfileId] = useState("");
  const [targets, setTargets] = useState<TargetResponse | null>(null);
  const [targetId, setTargetId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [qrTarget, setQrTarget] = useState<Target | null>(null);
  const [productEditor, setProductEditor] = useState<Product | null>(null);
  const [productProfileId, setProductProfileId] = useState("");
  const [productTargets, setProductTargets] = useState<Target[]>([]);
  const [productTargetId, setProductTargetId] = useState("");
  const [activationOpen, setActivationOpen] = useState(false);
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const [activationProfileId, setActivationProfileId] = useState("");
  const [activationTargets, setActivationTargets] = useState<Target[]>([]);
  const [activationTargetId, setActivationTargetId] = useState("profile");
  const [scratch, setScratch] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadTargets = useCallback(async (nextProfileId: string) => {
    if (!nextProfileId) return null;
    const response = await fetch(`/api/profiles/${encodeURIComponent(nextProfileId)}/share-targets?locale=${locale}`, { cache: "no-store" });
    const json = await response.json() as TargetResponse;
    if (!response.ok) throw new Error(json.error || "SHARE_TARGETS_FAILED");
    return json;
  }, [locale]);

  async function inspectIdentifier(identifier: string, preferredProfileId?: string) {
    setBusy(true); setFeedback("");
    try {
      const response = await fetch("/api/share/activation/inspect", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier }),
      });
      const json = await response.json() as Inspect;
      setInspect(json);
      if (!response.ok) setFeedback(copy.activationUnavailable);
      if (json.nextAction === "ENTER_SCRATCH") {
        const selected = preferredProfileId || activationProfileId || profileId;
        setActivationProfileId(selected);
        const result = await loadTargets(selected);
        setActivationTargets(result?.targets || []); setActivationTargetId(result?.targets[0]?.id || "profile");
        void trackFirebaseAnalyticsEvent("activation_scanned", { platform: "web", method: "qr", outcome: "eligible" });
      }
    } catch { setFeedback(copy.activationUnavailable); } finally { setBusy(false); }
  }

  const load = useCallback(async () => {
    setLoading(true); setFeedback("");
    try {
      const [profileResponse, productsResponse] = await Promise.all([
        fetch("/api/profiles", { cache: "no-store" }),
        fetch("/api/share/products", { cache: "no-store" }),
      ]);
      const profileJson = await profileResponse.json() as Selector;
      const productsJson = await productsResponse.json() as { ok: boolean; products: Product[]; error?: string };
      if (!profileResponse.ok || !productsResponse.ok) throw new Error(productsJson.error || "SHARE_LOAD_FAILED");
      const selected = profileJson.selectedProfileId || profileJson.profiles[0]?.id || "";
      setSelector(profileJson); setProfileId(selected); setProducts(productsJson.products || []);
      const nextTargets = selected ? await loadTargets(selected) : null;
      setTargets(nextTargets); setTargetId(nextTargets?.targets[0]?.id || "");
      setActivationProfileId(selected);
      void trackFirebaseAnalyticsEvent("share_center_viewed", { platform: "web" });
      const identifier = new URLSearchParams(window.location.search).get("activate");
      if (identifier) {
        setActivationOpen(true);
        await inspectIdentifier(identifier, selected);
      }
    } catch {
      setFeedback(copy.loadFailed);
    } finally { setLoading(false); }
    // inspectIdentifier reads the resolved profile state established above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy.loadFailed, loadTargets]);

  useEffect(() => { void load(); }, [load]);

  async function chooseProfile(next: string) {
    setProfileId(next); setBusy(true); setFeedback("");
    try {
      const nextTargets = await loadTargets(next);
      setTargets(nextTargets); setTargetId(nextTargets?.targets[0]?.id || "");
      void trackFirebaseAnalyticsEvent("share_profile_selected", { platform: "web" });
    } catch { setFeedback(copy.loadFailed); } finally { setBusy(false); }
  }

  const selectedTarget = useMemo(() => targets?.targets.find(item => item.id === targetId) || null, [targetId, targets]);

  async function copyUrl(url: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement("textarea");
        field.value = url;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("COPY_UNAVAILABLE");
      }
      setFeedback(copy.copied);
      void trackFirebaseAnalyticsEvent("share_link_copied", { platform: "web", method: "copy" });
    } catch {
      setFeedback(copy.saveFailed);
    }
  }

  async function nativeShare(target: Target) {
    if (navigator.share) {
      try {
        await navigator.share({ title: target.label, url: target.canonicalUrl });
        setFeedback(copy.shareOpened);
        void trackFirebaseAnalyticsEvent("native_share_opened", { platform: "web", method: "native_share" });
      } catch {
        // Cancellation is not an error and must not be reported as a completed share.
      }
    } else {
      await copyUrl(target.canonicalUrl);
    }
  }

  async function productProfile(nextProfileId: string, currentProduct?: Product | null) {
    setProductProfileId(nextProfileId); setBusy(true);
    try {
      const result = await loadTargets(nextProfileId);
      const available = result?.targets || [];
      const active = currentProduct?.shareTarget;
      const selected = available.find(target =>
        target.id === active?.id ||
        target.id === `destination:${active?.id}` ||
        (target.type === "PROFILE" && active?.type === "PROFILE") ||
        (target.type === "CONTACT" && active?.type === "VCF")
      );
      setProductTargets(available); setProductTargetId(selected?.id || available[0]?.id || "");
    } catch { setFeedback(copy.targetUnavailable); } finally { setBusy(false); }
  }

  async function openProduct(product: Product) {
    setProductEditor(product);
    await productProfile(product.profile?.id || profileId, product);
  }

  async function updateProduct(action: Record<string, unknown>) {
    if (!productEditor || busy) return;
    setBusy(true); setFeedback("");
    try {
      const response = await fetch(`/api/share/products/${encodeURIComponent(productEditor.id)}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...action, locale }),
      });
      const json = await response.json() as { ok: boolean; product?: Product; error?: string };
      if (!response.ok || !json.product) throw new Error(json.error || "PRODUCT_UPDATE_FAILED");
      setProducts(current => current.map(item => item.id === json.product?.id ? json.product : item));
      setProductEditor(json.product); setFeedback(action.action === "TARGET_CHANGE" ? copy.targetUpdated : copy.statusUpdated);
      void trackFirebaseAnalyticsEvent("physical_product_target_updated", { platform: "web", outcome: "success" });
    } catch { setFeedback(copy.saveFailed); } finally { setBusy(false); }
  }

  async function changeActivationProfile(next: string) {
    setActivationProfileId(next); setBusy(true);
    try {
      const result = await loadTargets(next);
      setActivationTargets(result?.targets || []); setActivationTargetId(result?.targets[0]?.id || "profile");
    } catch { setFeedback(copy.targetUnavailable); } finally { setBusy(false); }
  }

  async function claimProduct() {
    if (!inspect?.identifier || !/^\d{6}$/.test(scratch) || !activationProfileId || !activationTargetId || busy) return;
    setBusy(true); setFeedback("");
    try {
      const response = await fetch("/api/share/activation/claim", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: inspect.identifier, scratchSecret: scratch, profileId: activationProfileId, targetId: activationTargetId, locale }),
      });
      const json = await response.json() as { ok: boolean; product?: Product; error?: string };
      if (!response.ok || !json.ok) {
        setFeedback(json.error === "ACTIVATION_COOLDOWN" ? copy.cooldown : copy.activationFailed);
        void trackFirebaseAnalyticsEvent("activation_failed", { platform: "web", method: "manual", outcome: json.error === "ACTIVATION_COOLDOWN" ? "cooldown" : "rejected" });
        return;
      }
      if (json.product) setProducts(current => [json.product!, ...current.filter(item => item.id !== json.product?.id)]);
      setScratch(""); setInspect(null); setActivationOpen(false); setFeedback(copy.activated);
      void trackFirebaseAnalyticsEvent("activation_completed", { platform: "web", method: "manual", outcome: "success" });
    } catch { setFeedback(copy.activationFailed); } finally { setBusy(false); }
  }

  if (loading) return <div className="card flex min-h-72 items-center justify-center" role="status"><LoaderCircle className="animate-spin"/><span className="ms-3">{copy.loading}</span></div>;
  return <div className="space-y-7">
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-brand-400">{copy.eyebrow}</p><h1 className="mt-2 text-3xl font-black">{copy.title}</h1><p className="mt-2 max-w-2xl text-slate-400">{copy.description}</p></header>
    {feedback && <div className="flex items-center gap-2 rounded-xl bg-brand-400/10 p-3 text-sm text-brand-200" role="status" aria-live="polite"><Check size={16}/>{feedback}</div>}

    <section className="card p-5">
      <h2 className="text-xl font-black">{copy.whatTitle}</h2><p className="mt-1 text-sm text-slate-500">{copy.whatHelp}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label><span className="label">{copy.profile}</span><select className="input" value={profileId} onChange={event => void chooseProfile(event.target.value)} disabled={busy}>{selector?.profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.label}{profile.isPrimary ? ` · ${copy.primary}` : ""}</option>)}</select></label>
        <label><span className="label">{copy.target}</span><select className="input" value={targetId} onChange={event => setTargetId(event.target.value)} disabled={!targets?.shareable || busy}>{(targets?.targets || []).map(target => <option value={target.id} key={target.id}>{target.label}</option>)}</select></label>
      </div>
      {!targets?.shareable && <div className="mt-4 flex gap-2 rounded-xl bg-amber-400/10 p-4 text-sm text-amber-100"><CircleAlert className="shrink-0" size={18}/><span>{targets?.reason === "PROFILE_PAUSED" ? copy.profilePaused : copy.publishRequired}</span></div>}
    </section>

    <section className="card p-5">
      <h2 className="text-xl font-black">{copy.howTitle}</h2><p className="mt-1 text-sm text-slate-500">{copy.howHelp}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button className="flex min-h-32 flex-col items-start rounded-2xl bg-white/5 p-4 text-start disabled:opacity-40" disabled={!selectedTarget} onClick={() => {
          setQrTarget(selectedTarget);
          void trackFirebaseAnalyticsEvent("share_qr_opened", { platform: "web", method: "qr" });
        }}><QrCode/><strong className="mt-3">{copy.qr}</strong><span className="mt-1 text-xs text-slate-500">{copy.qrReady}</span></button>
        <button className="flex min-h-32 flex-col items-start rounded-2xl bg-white/5 p-4 text-start disabled:opacity-40" disabled={!selectedTarget} onClick={() => selectedTarget && void nativeShare(selectedTarget)}><Share2/><strong className="mt-3">{copy.nativeShare}</strong><span className="mt-1 text-xs text-slate-500">{copy.nativeHelp}</span></button>
        <button className="flex min-h-32 flex-col items-start rounded-2xl bg-white/5 p-4 text-start disabled:opacity-40" disabled={!selectedTarget} onClick={() => selectedTarget && void copyUrl(selectedTarget.canonicalUrl)}><Copy/><strong className="mt-3">{copy.copy}</strong><span className="mt-1 text-xs text-slate-500">{copy.copyHelp}</span></button>
        <div className="flex min-h-32 flex-col items-start rounded-2xl bg-white/5 p-4 text-start opacity-75"><Nfc/><strong className="mt-3">{copy.nearby}</strong><span className="mt-1 text-xs text-slate-500">{copy.androidOnly}</span></div>
      </div>
    </section>

    <section>
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-black">{copy.products}</h2><p className="mt-1 text-sm text-slate-500">{copy.productsHelp}</p></div><button className="btn-primary" onClick={() => { setActivationOpen(true); setInspect(null); setScratch(""); void trackFirebaseAnalyticsEvent("activation_started", { platform: "web", method: "manual" }); }}><ScanLine size={17}/>{copy.activate}</button></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {products.map(product => <article className="card p-5" key={product.id}>
          <div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-400/10 text-brand-300"><CreditCard/></span><div className="min-w-0 flex-1"><h3 className="font-black">{product.label}</h3><p className="font-mono text-xs text-slate-500" dir="ltr">{product.maskedSerial}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/5 px-2 py-1">{productType(copy, product.productType)}</span><span className="rounded-full bg-white/5 px-2 py-1">{productStatus(copy, product.status)}</span></div></div></div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">{copy.assignedProfile}</dt><dd>{product.profile?.label || copy.notAssigned}</dd></div><div><dt className="text-slate-500">{copy.currentTarget}</dt><dd>{product.shareTarget?.label || copy.notConfigured}</dd></div></dl>
          <div className="mt-4 flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => void openProduct(product)}>{copy.manage}</button><button className="btn-secondary" onClick={() => void copyUrl(product.permanentUrl)}><Clipboard size={15}/>{copy.permanentLink}</button></div>
        </article>)}
        {!products.length && <div className="card p-8 text-center text-slate-400 lg:col-span-2"><CreditCard className="mx-auto"/><p className="mt-3">{copy.noProducts}</p></div>}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm"><Link className="text-brand-300" href="/dashboard/tags">{copy.legacyCards} <ExternalLink className="inline" size={13}/></Link><Link className="text-brand-300" href="/dashboard/wallet">{copy.wallet} <ExternalLink className="inline" size={13}/></Link></div>
    </section>

    {qrTarget && <Dialog title={qrTarget.label} close={() => setQrTarget(null)}>
      <div className="text-center"><p className="text-sm text-slate-400">{copy.qrReadyHelp}</p><div className="mx-auto mt-5 inline-flex rounded-3xl bg-white p-5" role="img" aria-label={`${copy.qr}: ${qrTarget.label}`}><QRCodeSVG value={qrTarget.canonicalUrl} size={280} bgColor="#ffffff" fgColor="#000000" level="H"/></div><p className="mx-auto mt-4 max-w-md break-all font-mono text-xs text-slate-500" dir="ltr">{qrTarget.canonicalUrl}</p><div className="mt-5 grid gap-2 sm:grid-cols-2"><button className="btn-primary" onClick={() => void nativeShare(qrTarget)}><Share2 size={17}/>{copy.nativeShare}</button><button className="btn-secondary" onClick={() => void copyUrl(qrTarget.canonicalUrl)}><Copy size={17}/>{copy.copy}</button></div><p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500"><Nfc size={15}/>{copy.compatibleNfc}</p></div>
    </Dialog>}

    {productEditor && <Dialog title={productEditor.label} close={() => setProductEditor(null)}>
      <div className="space-y-4"><p className="rounded-xl bg-white/5 p-4 text-sm text-slate-300">{copy.permanentSafety}</p><label><span className="label">{copy.assignedProfile}</span><select className="input" value={productProfileId} onChange={event => void productProfile(event.target.value)} disabled={!productEditor.capabilities.targetChange}>{selector?.profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label><label><span className="label">{copy.currentTarget}</span><select className="input" value={productTargetId} onChange={event => setProductTargetId(event.target.value)} disabled={!productEditor.capabilities.targetChange}>{productTargets.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label><button className="btn-primary w-full" disabled={busy || !productTargetId || !productEditor.capabilities.targetChange} onClick={() => void updateProduct({ action: "TARGET_CHANGE", profileId: productProfileId, targetId: productTargetId })}>{copy.saveTarget}</button><div className="border-t border-white/10 pt-4">{productEditor.capabilities.pause ? <button className="btn-secondary w-full" onClick={() => void updateProduct({ action: "STATUS_CHANGE", status: "PAUSED" })}><Pause size={16}/>{copy.pause}</button> : productEditor.capabilities.resume ? <button className="btn-secondary w-full" onClick={() => void updateProduct({ action: "STATUS_CHANGE", status: "ACTIVE" })}><Play size={16}/>{copy.resume}</button> : <p className="text-sm text-slate-400">{copy.legacyStatusHelp}</p>}<Link className="btn-secondary mt-2 w-full" href={`/dashboard/tags/${encodeURIComponent(productEditor.id)}`}>{copy.productDetails}<ExternalLink size={15}/></Link></div></div>
    </Dialog>}

    {activationOpen && <Dialog title={copy.activate} close={() => setActivationOpen(false)} wide>
      {!inspect?.eligible ? <div>{inspect?.nextAction === "LEGACY_FLOW" ? <div className="text-center"><p className="text-slate-300">{copy.legacyActivation}</p><Link className="btn-primary mt-5" href={inspect.legacyUrl || "/activate/scan"}>{copy.continueLegacy}</Link></div> : inspect?.nextAction === "COOLDOWN" ? <p className="rounded-xl bg-amber-400/10 p-4 text-amber-100">{copy.cooldown}</p> : inspect?.nextAction === "ALREADY_OWNED" ? <p className="rounded-xl bg-emerald-400/10 p-4 text-emerald-200">{copy.alreadyOwned}</p> : <ActivationScanner locale={locale} onIdentified={inspectIdentifier}/>}</div>
        : <div className="space-y-5">
          <div className="rounded-2xl bg-white/5 p-4"><p className="font-bold">{inspect.product?.label}</p><p className="mt-1 font-mono text-xs text-slate-500" dir="ltr">{inspect.product?.maskedSerial}</p></div>
          <div className="rounded-xl bg-brand-400/10 p-4 text-sm text-brand-100"><ShieldCheck className="mb-2"/>{copy.scratchHelp}</div>
          <label><span className="label">{copy.scratch}</span><input className="input text-center font-mono text-2xl tracking-[.45em]" dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={scratch} onChange={event => setScratch(event.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6}/></label>
          <label><span className="label">{copy.assignedProfile}</span><select className="input" value={activationProfileId} onChange={event => void changeActivationProfile(event.target.value)}>{selector?.profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
          <label><span className="label">{copy.currentTarget}</span><select className="input" value={activationTargetId} onChange={event => setActivationTargetId(event.target.value)}>{activationTargets.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label>
          <button className="btn-primary w-full" disabled={busy || scratch.length !== 6 || !activationTargetId} onClick={() => void claimProduct()}>{busy ? <LoaderCircle className="animate-spin" size={17}/> : <ShieldCheck size={17}/>} {copy.activateSecurely}</button>
          <button className="btn-secondary w-full" onClick={() => { setInspect(null); setScratch(""); }}>{copy.scanAnother}</button>
        </div>}
    </Dialog>}
  </div>;
}
