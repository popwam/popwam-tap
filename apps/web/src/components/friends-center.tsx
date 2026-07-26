"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Ban, BellOff, Heart, Search, ShieldAlert, UserMinus, UserPlus, Users } from "lucide-react";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";

type Copy = Record<string, string>;
type Identity = { key: string; profile: { slug: string; name: string; title: string | null; avatarUrl: string | null } };
type Friend = Identity & { relationshipState: string; favorite: boolean; muted: boolean };
type FriendRequest = { id: string; direction: "INCOMING" | "OUTGOING"; createdAt: string; person: Identity };
type SearchResult = Identity & { relationshipState: string };
type Settings = {
  policy: { available: boolean; accepted: boolean; version: string | null; path: string };
  preference: { socialProfileSlug: string | null; allowFriendRequests: boolean; discoverableByProfileSearch: boolean; profileConfigured: boolean; privacyConfigured: boolean; configured: boolean };
  profiles: Array<{ slug: string; name: string; title: string | null; access: string; primary: boolean }>;
};
type Block = { id: string; person: Identity | null; createdAt: string };
type Tab = "friends" | "requests" | "search" | "privacy" | "blocked";

async function jsonRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || "FRIENDS_REQUEST_FAILED");
  return json;
}

function Avatar({ person }: { person: Identity }) {
  return person.profile.avatarUrl
    ? <img src={person.profile.avatarUrl} alt="" className="size-12 rounded-full object-cover"/>
    : <span className="flex size-12 items-center justify-center rounded-full bg-brand-500/15 text-lg font-black text-brand-400">{person.profile.name.slice(0, 1).toUpperCase()}</span>;
}

function Person({ person }: { person: Identity }) {
  return <div className="flex min-w-0 items-center gap-3">
    <Avatar person={person}/>
    <div className="min-w-0">
      <Link href={`/p/${encodeURIComponent(person.profile.slug)}`} className="truncate font-bold hover:text-brand-400">{person.profile.name}</Link>
      {person.profile.title && <p className="truncate text-sm text-slate-500">{person.profile.title}</p>}
    </div>
  </div>;
}

export function FriendsCenter({ locale, copy, initialTab = "friends" }: { locale: "ar" | "en"; copy: Copy; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [query, setQuery] = useState("");
  const [friendFilter, setFriendFilter] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState<{ type: "remove" | "block"; person: Identity } | null>(null);
  const [reporting, setReporting] = useState<Identity | null>(null);
  const [reported, setReported] = useState<Identity | null>(null);
  const [reportCategory, setReportCategory] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");

  const loadSettings = useCallback(async () => {
    const json = await jsonRequest(`/api/friends/settings?locale=${locale}`);
    setSettings(json);
    setSelectedProfile(json.preference.socialProfileSlug || json.profiles[0]?.slug || "");
  }, [locale]);

  const loadTab = useCallback(async (next: Tab) => {
    setError("");
    if (next === "friends") setFriends((await jsonRequest(`/api/friends?locale=${locale}`)).friends);
    if (next === "requests") setRequests((await jsonRequest(`/api/friends/requests?locale=${locale}`)).requests);
    if (next === "blocked") setBlocks((await jsonRequest(`/api/blocks?locale=${locale}`)).blocks);
  }, [locale]);

  useEffect(() => {
    setBusy(true);
    loadSettings().catch((reason) => setError(reason.message)).finally(() => setBusy(false));
    void trackFirebaseAnalyticsEvent("friends_viewed", { platform: "web" });
  }, [loadSettings]);

  useEffect(() => {
    if (!settings?.policy.accepted || !settings.preference.configured || tab === "search" || tab === "privacy") return;
    setBusy(true);
    loadTab(tab).catch((reason) => setError(reason.message)).finally(() => setBusy(false));
  }, [loadTab, settings?.policy.accepted, settings?.preference.configured, tab]);

  async function mutate(path: string, method: string, body?: object) {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await jsonRequest(path, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      await loadSettings();
      await loadTab(tab === "search" || tab === "privacy" ? "friends" : tab).catch(() => undefined);
      return result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "FRIENDS_REQUEST_FAILED");
      return null;
    } finally { setBusy(false); }
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (query.normalize("NFKC").trim().length < 2) { setError(copy.minimumSearch); return; }
    setBusy(true); setError("");
    try {
      const json = await jsonRequest(`/api/friends/search?locale=${locale}&q=${encodeURIComponent(query)}`);
      setResults(json.results);
      void trackFirebaseAnalyticsEvent("friend_search_used", { platform: "web", outcome: json.results.length ? "results" : "empty" });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "FRIENDS_REQUEST_FAILED"); }
    finally { setBusy(false); }
  }

  async function requestAction(request: FriendRequest, action: "accept" | "reject" | "cancel") {
    const path = action === "cancel" ? `/api/friends/requests/${request.id}` : `/api/friends/requests/${request.id}/${action}`;
    const result = await mutate(path, action === "cancel" ? "DELETE" : "POST", action === "cancel" ? undefined : { locale });
    if (result) {
      void trackFirebaseAnalyticsEvent(action === "accept" ? "friend_request_accepted" : "friend_request_rejected", { platform: "web", outcome: "success" });
      setRequests((current) => current.filter((item) => item.id !== request.id));
    }
  }

  async function preference(friend: Friend, key: "favorite" | "muted") {
    const value = !friend[key];
    const result = await mutate(`/api/friends/${friend.key}`, "PATCH", { [key]: value });
    if (result) {
      setFriends((current) => current.map((item) => item.key === friend.key ? { ...item, [key]: value } : item));
      void trackFirebaseAnalyticsEvent(key === "favorite" ? "friend_favorited" : "friend_muted", { platform: "web", outcome: value ? "enabled" : "disabled" });
    }
  }

  async function confirmAction() {
    if (!confirm) return;
    const result = confirm.type === "remove"
      ? await mutate(`/api/friends/${confirm.person.key}`, "DELETE")
      : await mutate("/api/blocks", "POST", { targetKey: confirm.person.key, source: "FRIENDS" });
    if (result) void trackFirebaseAnalyticsEvent(confirm.type === "remove" ? "friend_removed" : "user_blocked", { platform: "web", outcome: "success" });
    setConfirm(null);
  }

  async function submitReport(event: React.FormEvent) {
    event.preventDefault();
    if (!reporting) return;
    const result = await mutate("/api/reports", "POST", { targetKey: reporting.key, category: reportCategory, details: reportDetails, locale });
    if (result) {
      setMessage(copy.reportReceived);
      void trackFirebaseAnalyticsEvent("report_submitted", { platform: "web", outcome: "received", report_category: reportCategory });
      setReported(reporting); setReporting(null); setReportDetails("");
    }
  }

  if (!settings) return <div className="card p-8 text-center">{busy ? copy.loading : <button className="btn-secondary" onClick={() => void loadSettings()}>{copy.retry}</button>}</div>;
  if (!settings.policy.available) return <section className="card p-7"><h1 className="text-2xl font-black">{copy.policyTitle}</h1><p className="mt-3 text-slate-400">{copy.policyUnavailable}</p><Link href={settings.policy.path} className="btn-secondary mt-5">{copy.readPolicy}</Link></section>;
  if (!settings.policy.accepted) return <section className="card p-7"><h1 className="text-2xl font-black">{copy.policyTitle}</h1><p className="mt-3 text-slate-400">{copy.policyHelp}</p><div className="mt-6 flex flex-wrap gap-3"><Link href={settings.policy.path} className="btn-secondary">{copy.readPolicy}</Link><button disabled={busy} className="btn-primary" onClick={() => void mutate("/api/friends/community-policy", "POST", { locale })}>{copy.acceptPolicy}</button></div></section>;
  if (!settings.preference.profileConfigured) return <section className="card p-7"><h1 className="text-2xl font-black">{copy.chooseProfile}</h1><p className="mt-3 text-slate-400">{copy.chooseProfileHelp}</p>{settings.profiles.length ? <><select className="input mt-6" value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)} aria-label={copy.selectProfile}>{settings.profiles.map((profile) => <option key={profile.slug} value={profile.slug}>{profile.name}{profile.primary ? " · Primary" : ""}</option>)}</select><button disabled={busy || !selectedProfile} className="btn-primary mt-4 w-full" onClick={() => void mutate("/api/friends/settings", "PATCH", { socialProfileSlug: selectedProfile, locale })}>{copy.saveProfile}</button></> : <Link href="/dashboard/profile/publish" className="btn-primary mt-6">{copy.chooseProfileHelp}</Link>}</section>;
  if (!settings.preference.privacyConfigured) return <section className="card p-7"><h1 className="text-2xl font-black">{copy.privacy}</h1><p className="mt-3 text-slate-400">{copy.privacyHelp}</p><div className="mt-6 space-y-5"><label className="flex min-h-12 items-center justify-between gap-4"><span>{copy.allowRequests}</span><input type="checkbox" checked={settings.preference.allowFriendRequests} onChange={(event) => setSettings(current => current ? { ...current, preference: { ...current.preference, allowFriendRequests: event.target.checked } } : current)}/></label><label className="flex min-h-12 items-center justify-between gap-4"><span>{copy.discoverable}</span><input type="checkbox" checked={settings.preference.discoverableByProfileSearch} onChange={(event) => setSettings(current => current ? { ...current, preference: { ...current.preference, discoverableByProfileSearch: event.target.checked } } : current)}/></label><button className="btn-primary w-full" disabled={busy} onClick={() => void mutate("/api/friends/settings", "PATCH", { allowFriendRequests: settings.preference.allowFriendRequests, discoverableByProfileSearch: settings.preference.discoverableByProfileSearch, locale })}>{copy.continue}</button></div></section>;

  const tabs: Array<[Tab, string]> = [["friends", copy.friends], ["requests", copy.requests], ["search", copy.findPeople], ["privacy", copy.privacy], ["blocked", copy.blocked]];
  const visibleFriends = friends.filter(friend => `${friend.profile.name} ${friend.profile.title || ""}`.toLocaleLowerCase(locale).includes(friendFilter.trim().toLocaleLowerCase(locale)));
  return <div>
    <header><p className="text-sm font-bold text-brand-400">{copy.eyebrow}</p><h1 className="mt-1 text-3xl font-black">{copy.title}</h1><p className="mt-2 text-slate-500">{copy.description}</p></header>
    <nav className="mt-6 flex gap-2 overflow-x-auto" aria-label={copy.title}>{tabs.map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={tab === value ? "btn-primary shrink-0" : "btn-secondary shrink-0"}>{label}</button>)}</nav>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="mt-4 rounded-xl border border-brand-400/30 bg-brand-500/10 p-3 text-sm">{message}</p>}

    {tab === "friends" && <div className="mt-6 space-y-3">{friends.length > 0 && <input className="input" value={friendFilter} onChange={event => setFriendFilter(event.target.value.slice(0, 64))} placeholder={copy.searchCurrentFriends}/>} {visibleFriends.map((friend) => <article className="card p-4" key={friend.key}><div className="flex flex-wrap items-center justify-between gap-3"><Person person={friend}/><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => void preference(friend, "favorite")} aria-label={friend.favorite ? copy.unfavorite : copy.favorite}><Heart size={16} fill={friend.favorite ? "currentColor" : "none"}/></button><button className="btn-secondary" onClick={() => void preference(friend, "muted")} aria-label={friend.muted ? copy.unmute : copy.mute}><BellOff size={16}/></button><button className="btn-secondary" onClick={() => setReporting(friend)}>{copy.report}</button><button className="btn-secondary" onClick={() => setConfirm({ type: "remove", person: friend })}><UserMinus size={16}/>{copy.remove}</button><button className="btn-danger" onClick={() => setConfirm({ type: "block", person: friend })}><Ban size={16}/>{copy.block}</button></div></div></article>)}{!visibleFriends.length && !busy && <Empty icon={<Users/>} title={friends.length ? copy.noResults : copy.noFriends} help={friends.length ? undefined : copy.noFriendsHelp}/>}</div>}
    {tab === "requests" && <div className="mt-6 space-y-3">{requests.map((request) => <article className="card flex flex-wrap items-center justify-between gap-4 p-4" key={request.id}><Person person={request.person}/><div className="flex gap-2">{request.direction === "INCOMING" ? <><button className="btn-primary" onClick={() => void requestAction(request, "accept")}>{copy.accept}</button><button className="btn-secondary" onClick={() => void requestAction(request, "reject")}>{copy.decline}</button></> : <button className="btn-secondary" onClick={() => void requestAction(request, "cancel")}>{copy.cancel}</button>}<button className="btn-danger" onClick={() => setConfirm({ type: "block", person: request.person })}>{copy.block}</button></div></article>)}{!requests.length && !busy && <Empty icon={<UserPlus/>} title={copy.noRequests}/>}</div>}
    {tab === "search" && <div className="mt-6"><form onSubmit={search} className="card flex flex-col gap-3 p-4 sm:flex-row"><label className="sr-only" htmlFor="friend-search">{copy.findPeople}</label><input id="friend-search" className="input min-w-0 flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} maxLength={64}/><button className="btn-primary" disabled={busy}><Search size={16}/>{copy.search}</button></form><div className="mt-4 space-y-3">{results.map((person) => <article className="card flex flex-wrap items-center justify-between gap-3 p-4" key={person.key}><Person person={person}/>{person.relationshipState === "NONE" ? <button className="btn-primary" onClick={async () => { const result = await mutate("/api/friends/requests", "POST", { targetKey: person.key, source: "SEARCH", locale }); if (result) { setResults((current) => current.map((item) => item.key === person.key ? { ...item, relationshipState: result.state } : item)); void trackFirebaseAnalyticsEvent("friend_request_sent", { platform: "web", outcome: result.idempotent ? "idempotent" : "success", relationship_state: result.state }); } }}><UserPlus size={16}/>{copy.request}</button> : <span className="text-sm text-slate-500">{person.relationshipState === "FRIENDS" ? copy.friendsState : person.relationshipState === "OUTGOING_PENDING" ? copy.requested : copy.incoming}</span>}</article>)}{!results.length && query && !busy && <Empty icon={<Search/>} title={copy.noResults}/>}</div></div>}
    {tab === "privacy" && <section className="card mt-6 space-y-5 p-5"><label className="flex min-h-12 items-center justify-between gap-4"><span>{copy.allowRequests}</span><input type="checkbox" checked={settings.preference.allowFriendRequests} onChange={(event) => void mutate("/api/friends/settings", "PATCH", { allowFriendRequests: event.target.checked, locale })}/></label><label className="flex min-h-12 items-center justify-between gap-4"><span>{copy.discoverable}</span><input type="checkbox" checked={settings.preference.discoverableByProfileSearch} onChange={(event) => void mutate("/api/friends/settings", "PATCH", { discoverableByProfileSearch: event.target.checked, locale })}/></label><p className="text-sm text-slate-500">{copy.privacyHelp}</p><label><span className="label">{copy.chooseProfile}</span><select className="input" value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)}>{settings.profiles.map((profile) => <option key={profile.slug} value={profile.slug}>{profile.name}</option>)}</select></label><button className="btn-secondary w-full" onClick={() => void mutate("/api/friends/settings", "PATCH", { socialProfileSlug: selectedProfile, locale })}>{copy.saveProfile}</button></section>}
    {tab === "blocked" && <div className="mt-6 space-y-3">{blocks.map((block) => <article className="card flex items-center justify-between gap-3 p-4" key={block.id}>{block.person ? <Person person={block.person}/> : <span>{copy.unavailable}</span>}<button className="btn-secondary" onClick={async () => { const result = await mutate(`/api/blocks/${block.id}`, "DELETE"); if (result) void trackFirebaseAnalyticsEvent("user_unblocked", { platform: "web", outcome: "success" }); }}>{copy.unblock}</button></article>)}{!blocks.length && !busy && <Empty icon={<Ban/>} title={copy.blocked}/>}</div>}

    {confirm && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="friend-confirm-title"><section className="card max-w-md p-6"><h2 id="friend-confirm-title" className="text-xl font-black">{confirm.type === "remove" ? copy.remove : copy.block}</h2><p className="mt-3 text-slate-400">{confirm.type === "remove" ? copy.removeConfirm : copy.blockConfirm}</p><div className="mt-6 flex justify-end gap-3"><button className="btn-secondary" onClick={() => setConfirm(null)}>{copy.close}</button><button className="btn-danger" disabled={busy} onClick={() => void confirmAction()}>{confirm.type === "remove" ? copy.remove : copy.block}</button></div></section></div>}
    {reporting && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="friend-report-title"><form onSubmit={submitReport} className="card w-full max-w-lg p-6"><h2 id="friend-report-title" className="text-xl font-black">{copy.reportTitle}</h2><select className="input mt-5" value={reportCategory} onChange={(event) => setReportCategory(event.target.value)}>{["SPAM","HARASSMENT","IMPERSONATION","INAPPROPRIATE_CONTENT","SCAM","PRIVACY","OTHER"].map((category) => <option key={category} value={category}>{copy[category]}</option>)}</select><label className="mt-4 block"><span className="label">{copy.reportDetails}</span><textarea className="input min-h-28" maxLength={500} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)}/></label><div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setReporting(null)}>{copy.close}</button><button className="btn-primary" disabled={busy}><ShieldAlert size={16}/>{copy.submit}</button></div></form></div>}
    {reported && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="friend-report-received-title"><section className="card w-full max-w-md p-6"><h2 id="friend-report-received-title" className="text-xl font-black">{copy.reportReceived}</h2><p className="mt-3 text-slate-400">{copy.offerBlock}</p><div className="mt-6 flex justify-end gap-3"><button className="btn-secondary" onClick={() => setReported(null)}>{copy.close}</button><button className="btn-danger" onClick={async () => { const person=reported; const result=await mutate("/api/blocks","POST",{targetKey:person.key,source:"REPORT"}); if(result)void trackFirebaseAnalyticsEvent("user_blocked",{platform:"web",outcome:"success"}); setReported(null); }}>{copy.block}</button></div></section></div>}
  </div>;
}

function Empty({ icon, title, help }: { icon: React.ReactNode; title: string; help?: string }) {
  return <div className="card p-8 text-center text-slate-500"><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/5">{icon}</div><p className="mt-3 font-bold text-slate-300">{title}</p>{help && <p className="mt-1 text-sm">{help}</p>}</div>;
}
