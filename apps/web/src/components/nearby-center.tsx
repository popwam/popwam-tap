"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ban, LocateFixed, MapPinOff, ShieldAlert, UserPlus, Users } from "lucide-react";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";

type Copy = Record<string, string>;
type NearbyStage = "UNAVAILABLE" | "COMMUNITY_REQUIRED" | "CONSENT_REQUIRED" | "PROFILE_REQUIRED" | "OFF" | "READY_TO_RESUME" | "ACTIVE";
type Session = { generation: number; sessionToken: string; expiresInSeconds: number };
type Status = {
  feature: { state: string; available: boolean; presenceEnabled: boolean; discoveryEnabled: boolean };
  consent: { available: boolean; accepted: boolean; version: string | null; path: string };
  socialProfile: { eligible: boolean; path: string };
  preference: { enabled: boolean; discoverable: boolean };
  presence: { active: boolean };
  stage: NearbyStage;
};
type Result = {
  key: string;
  profile: { slug: string; name: string; title: string | null; avatarUrl: string | null };
  proximityBand: "SAME_AREA" | "NEARBY_AREA" | "AROUND_THIS_AREA";
  relationshipState: "NONE" | "OUTGOING_PENDING" | "INCOMING_PENDING" | "FRIENDS";
  requestId: string | null;
  capabilities: {
    canViewProfile: boolean;
    canSendFriendRequest: boolean;
    canAcceptRequest: boolean;
    canCancelRequest: boolean;
    canBlock: boolean;
    canReport: boolean;
  };
};

async function jsonRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || "NEARBY_REQUEST_FAILED");
  return json;
}

function requestJson(path: string, method: string, body?: object) {
  return jsonRequest(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function approximatePosition() {
  return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("PERMISSION_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(new Error(error.code === error.PERMISSION_DENIED ? "PERMISSION_DENIED" : "LOCATION_UNAVAILABLE")),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}

function Avatar({ result }: { result: Result }) {
  return result.profile.avatarUrl
    ? <img src={result.profile.avatarUrl} alt="" className="size-14 rounded-full object-cover"/>
    : <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xl font-black text-brand-400">{result.profile.name.slice(0, 1).toUpperCase()}</span>;
}

export function NearbyCenter({ locale, copy }: { locale: "ar" | "en"; copy: Copy }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [permissionError, setPermissionError] = useState("");
  const [blocking, setBlocking] = useState<Result | null>(null);
  const [reporting, setReporting] = useState<Result | null>(null);
  const [reportCategory, setReportCategory] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [message, setMessage] = useState("");
  const sessionRef = useRef<Session | null>(null);
  const aliveRef = useRef(true);

  const loadStatus = useCallback(async () => {
    const next = await jsonRequest(`/api/nearby/settings?locale=${locale}`);
    if (aliveRef.current) setStatus(next);
    return next as Status;
  }, [locale]);

  const loadResults = useCallback(async () => {
    const json = await jsonRequest(`/api/nearby?locale=${locale}`);
    if (!aliveRef.current) return;
    setResults(json.results);
    void trackFirebaseAnalyticsEvent("nearby_results_loaded", {
      platform: "web",
      outcome: json.results.length ? "available" : "empty",
    });
  }, [locale]);

  useEffect(() => {
    aliveRef.current = true;
    setBusy(true);
    loadStatus()
      .then((next) => {
        void trackFirebaseAnalyticsEvent("nearby_viewed", { platform: "web", feature_state: next.feature.state });
        if (!next.feature.available) void trackFirebaseAnalyticsEvent("nearby_unavailable", { platform: "web", feature_state: next.feature.state });
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "NEARBY_REQUEST_FAILED"))
      .finally(() => setBusy(false));
    return () => {
      aliveRef.current = false;
      sessionRef.current = null;
    };
  }, [loadStatus]);

  useEffect(() => {
    if (status?.stage === "CONSENT_REQUIRED") {
      void trackFirebaseAnalyticsEvent("nearby_consent_viewed", { platform: "web", feature_state: status.feature.state });
    }
  }, [status?.stage, status?.feature.state]);

  useEffect(() => {
    if (!session) return;
    let stopped = false;
    async function heartbeat() {
      const current = sessionRef.current;
      if (stopped || !current || document.visibilityState !== "visible") return;
      try {
        const coordinate = await approximatePosition();
        if (stopped || document.visibilityState !== "visible" || sessionRef.current !== current) return;
        await requestJson(`/api/nearby/presence?locale=${locale}`, "POST", {
          action: "REFRESH",
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          generation: current.generation,
          sessionToken: current.sessionToken,
        });
      } catch (reason) {
        if (reason instanceof Error && reason.message === "NEARBY_SESSION_STALE") {
          sessionRef.current = null;
          setSession(null);
          setResults([]);
          await loadStatus().catch(() => undefined);
        }
      }
    }
    const interval = window.setInterval(() => void heartbeat(), 90_000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [session, locale, loadStatus]);

  function permissionMessage(code: string) {
    if (code === "PERMISSION_DENIED") return copy.permissionDenied;
    if (code === "PERMISSION_UNAVAILABLE") return copy.permissionUnavailable;
    return copy.locationUnavailable;
  }

  async function acceptConsent() {
    setBusy(true); setError("");
    try {
      await requestJson("/api/nearby/consent", "POST", { locale });
      void trackFirebaseAnalyticsEvent("nearby_consent_accepted", { platform: "web", outcome: "success" });
      await loadStatus();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "NEARBY_REQUEST_FAILED");
    } finally { setBusy(false); }
  }

  async function enable() {
    setBusy(true); setError(""); setPermissionError("");
    try {
      const coordinate = await approximatePosition();
      void trackFirebaseAnalyticsEvent("nearby_permission_result", { platform: "web", permission_state: "granted" });
      const json = await requestJson(`/api/nearby/presence?locale=${locale}`, "POST", {
        action: "ENABLE",
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
      const nextSession = json.session as Session;
      sessionRef.current = nextSession;
      setSession(nextSession);
      await loadStatus();
      await loadResults();
      void trackFirebaseAnalyticsEvent("nearby_enabled", { platform: "web", outcome: "success" });
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "NEARBY_REQUEST_FAILED";
      if (code === "PERMISSION_DENIED" || code === "PERMISSION_UNAVAILABLE" || code === "LOCATION_UNAVAILABLE") {
        setPermissionError(permissionMessage(code));
        void trackFirebaseAnalyticsEvent("nearby_permission_result", {
          platform: "web",
          permission_state: code === "PERMISSION_DENIED" ? "denied" : "unavailable",
        });
      } else {
        setError(code);
        await loadStatus().catch(() => undefined);
      }
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setError("");
    sessionRef.current = null;
    setSession(null);
    setResults([]);
    try {
      await requestJson("/api/nearby/presence", "DELETE");
      await loadStatus();
      void trackFirebaseAnalyticsEvent("nearby_disabled", { platform: "web", outcome: "success" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "NEARBY_REQUEST_FAILED");
      await loadStatus().catch(() => undefined);
    } finally { setBusy(false); }
  }

  async function addFriend(result: Result) {
    setBusy(true); setError("");
    void trackFirebaseAnalyticsEvent("nearby_friend_request_started", { platform: "web", relationship_state: result.relationshipState });
    try {
      await requestJson("/api/friends/requests", "POST", { targetKey: result.key, source: "NEARBY", locale });
      await loadResults();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "NEARBY_REQUEST_FAILED"); }
    finally { setBusy(false); }
  }

  async function cancelFriendRequest(result: Result) {
    if (!result.requestId) {
      await loadResults().catch(() => undefined);
      return;
    }
    setBusy(true); setError("");
    try {
      await requestJson(`/api/friends/requests/${result.requestId}`, "DELETE");
      await loadResults();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "NEARBY_REQUEST_FAILED"); }
    finally { setBusy(false); }
  }

  async function block() {
    if (!blocking) return;
    const target = blocking;
    setBlocking(null);
    setResults((current) => current.filter((result) => result.key !== target.key));
    try {
      await requestJson("/api/blocks", "POST", { targetKey: target.key, source: "NEARBY" });
      void trackFirebaseAnalyticsEvent("user_blocked", { platform: "web", outcome: "success" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "NEARBY_REQUEST_FAILED");
      await loadResults().catch(() => undefined);
    }
  }

  async function report(event: React.FormEvent) {
    event.preventDefault();
    if (!reporting) return;
    setBusy(true); setError("");
    try {
      await requestJson("/api/reports", "POST", {
        targetKey: reporting.key,
        category: reportCategory,
        details: reportDetails,
        source: "NEARBY",
        locale,
      });
      setReporting(null); setReportDetails(""); setMessage(copy.reportReceived);
      void trackFirebaseAnalyticsEvent("report_submitted", { platform: "web", outcome: "received", report_category: reportCategory });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "NEARBY_REQUEST_FAILED"); }
    finally { setBusy(false); }
  }

  if (!status) return <div className="card p-8 text-center">{busy ? copy.loading : <button className="btn-secondary" onClick={() => void loadStatus()}>{copy.retry}</button>}</div>;

  const stage = status.stage === "ACTIVE" && !session ? "READY_TO_RESUME" : status.stage;
  const stageCard = stage === "UNAVAILABLE"
    ? { icon: <MapPinOff/>, title: copy.unavailableTitle, help: copy.unavailableHelp }
    : stage === "COMMUNITY_REQUIRED"
      ? { icon: <ShieldAlert/>, title: copy.communityTitle, help: copy.communityHelp }
      : stage === "CONSENT_REQUIRED"
        ? { icon: <ShieldAlert/>, title: copy.consentTitle, help: copy.consentHelp }
        : stage === "PROFILE_REQUIRED"
          ? { icon: <Users/>, title: copy.profileTitle, help: copy.profileHelp }
          : stage === "READY_TO_RESUME"
            ? { icon: <LocateFixed/>, title: copy.resumeTitle, help: copy.resumeHelp }
            : { icon: <LocateFixed/>, title: copy.offTitle, help: copy.offHelp };

  return <div>
    <header>
      <p className="text-sm font-bold text-brand-400">{copy.eyebrow}</p>
      <h1 className="mt-1 text-3xl font-black">{copy.title}</h1>
      <p className="mt-2 max-w-3xl text-slate-500">{copy.description}</p>
    </header>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    {permissionError && <p role="alert" className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">{permissionError}</p>}
    {message && <p role="status" className="mt-4 rounded-xl border border-brand-400/30 bg-brand-500/10 p-3 text-sm">{message}</p>}

    {stage !== "ACTIVE" && <section className="card mt-6 p-7">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">{stageCard.icon}</span>
      <h2 className="mt-4 text-2xl font-black">{stageCard.title}</h2>
      <p className="mt-3 max-w-2xl leading-7 text-slate-400">{stageCard.help}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {stage === "COMMUNITY_REQUIRED" && <Link className="btn-primary" href="/dashboard/friends">{copy.openFriends}</Link>}
        {stage === "CONSENT_REQUIRED" && <><Link className="btn-secondary" href={status.consent.path}>{copy.readPrivacy}</Link><button className="btn-primary" disabled={busy} onClick={() => void acceptConsent()}>{copy.acceptConsent}</button></>}
        {stage === "PROFILE_REQUIRED" && <Link className="btn-primary" href={status.socialProfile.path}>{copy.manageProfile}</Link>}
        {(stage === "OFF" || stage === "READY_TO_RESUME") && <button className="btn-primary min-h-12" disabled={busy} onClick={() => void enable()}>{stage === "OFF" ? copy.enable : copy.resume}</button>}
      </div>
    </section>}

    {stage === "ACTIVE" && <section className="mt-6">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div><h2 className="text-xl font-black">{copy.activeTitle}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{copy.activeHelp}</p></div>
        <div className="flex flex-wrap gap-2"><button className="btn-secondary min-h-12" disabled={busy} onClick={() => void loadResults()}>{copy.refresh}</button><button className="btn-danger min-h-12" disabled={busy} onClick={() => void disable()}>{copy.disable}</button></div>
      </div>
      <div className="mt-5 space-y-3">
        {results.map((result) => <article key={result.key} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar result={result}/>
              <div className="min-w-0">
                <p className="truncate font-black">{result.profile.name}</p>
                {result.profile.title && <p className="truncate text-sm text-slate-500">{result.profile.title}</p>}
                <p className="mt-1 text-xs font-bold text-brand-400">{result.proximityBand === "SAME_AREA" ? copy.sameArea : result.proximityBand === "NEARBY_AREA" ? copy.nearbyArea : copy.aroundArea}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.capabilities.canViewProfile && <Link className="btn-secondary" href={`/p/${encodeURIComponent(result.profile.slug)}`} onClick={() => void trackFirebaseAnalyticsEvent("nearby_result_opened", { platform: "web", proximity_band: result.proximityBand })}>{copy.viewProfile}</Link>}
              {result.capabilities.canSendFriendRequest && <button className="btn-primary" disabled={busy} onClick={() => void addFriend(result)}><UserPlus size={16}/>{copy.addFriend}</button>}
              {result.relationshipState === "OUTGOING_PENDING" && (result.capabilities.canCancelRequest && result.requestId ? <button className="btn-secondary" disabled={busy} onClick={() => void cancelFriendRequest(result)}>{copy.cancelRequest}</button> : <span className="self-center text-sm text-slate-500">{copy.requested}</span>)}
              {result.relationshipState === "INCOMING_PENDING" && <Link className="btn-secondary" href="/dashboard/friends?tab=requests">{copy.incoming}</Link>}
              {result.relationshipState === "FRIENDS" && <span className="self-center text-sm text-slate-500">{copy.friends}</span>}
              {result.capabilities.canReport && <button className="btn-secondary" onClick={() => setReporting(result)}>{copy.report}</button>}
              {result.capabilities.canBlock && <button className="btn-danger" onClick={() => setBlocking(result)}><Ban size={16}/>{copy.block}</button>}
            </div>
          </div>
        </article>)}
        {!results.length && !busy && <div className="card p-8 text-center"><Users className="mx-auto text-slate-500"/><p className="mt-3 text-slate-400">{copy.noResults}</p></div>}
      </div>
    </section>}

    {blocking && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="nearby-block-title">
      <section className="card w-full max-w-md p-6"><h2 id="nearby-block-title" className="text-xl font-black">{copy.block}</h2><p className="mt-3 text-slate-400">{copy.blockConfirm}</p><div className="mt-6 flex justify-end gap-3"><button className="btn-secondary" onClick={() => setBlocking(null)}>{copy.cancel}</button><button className="btn-danger" onClick={() => void block()}>{copy.block}</button></div></section>
    </div>}
    {reporting && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="nearby-report-title">
      <form className="card w-full max-w-lg p-6" onSubmit={report}><h2 id="nearby-report-title" className="text-xl font-black">{copy.reportTitle}</h2><select className="input mt-5" value={reportCategory} onChange={(event) => setReportCategory(event.target.value)} aria-label={copy.reportTitle}>{["SPAM","HARASSMENT","IMPERSONATION","INAPPROPRIATE_CONTENT","SCAM","PRIVACY","OTHER"].map((category) => <option key={category} value={category}>{copy[category]}</option>)}</select><label className="mt-4 block"><span className="label">{copy.reportDetails}</span><textarea className="input min-h-28" maxLength={500} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)}/></label><div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setReporting(null)}>{copy.close}</button><button className="btn-primary" disabled={busy}>{copy.submit}</button></div></form>
    </div>}
  </div>;
}
