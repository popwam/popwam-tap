"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight, Eye, HelpCircle, KeyRound, Languages, LockKeyhole, MonitorSmartphone, Palette, Shield, UserRound, Video } from "lucide-react";
import { StepUpDialog, type StepUpCopy, type StepUpPurpose } from "@/components/step-up-dialog";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";

type Section = "root" | "appearance" | "notifications" | "privacy" | "permissions" | "security" | "devices" | "sessions" | "passkeys" | "account" | "help" | "legal";
type PreferenceState = {
  theme: "SYSTEM" | "LIGHT" | "DARK";
  language: "SYSTEM" | "ENGLISH" | "ARABIC";
  font: "DEFAULT" | "CAIRO" | "ABEEZEE";
  privacy: { shareActivityIdentity: boolean; profileVisibility: string; blockedUsers: number; nearby: { enabled: boolean; available: boolean; stage: string } };
};
type NotificationState = { generalEnabled: boolean; securityEnabled: boolean; productsEnabled: boolean; socialEnabled: boolean; marketingEnabled: boolean; osPermission: string; deliveryConfigured: boolean };
type Overview = { passkey: { configured: boolean; count: number }; devices: { active: number }; sessions: { active: number }; recovery: { phoneVerified: boolean }; currentSessionContext: string };
type Device = { id: string; type: string; label: string; platform: string; appName: string; appVersion: string | null; createdAt: string; lastActiveAt: string; lastAuthenticatedAt: string | null; authMethod: string; current: boolean; status: string; activeSessionCount: number; pushEnabled: boolean; passkeyCount: number };
type SecuritySession = { id: string; authority: string; deviceId: string | null; label: string; platform: string; appName: string; createdAt: string; lastActiveAt: string; expiresAt: string; authMethod: string; current: boolean; status: string; legacy: boolean };
type Passkey = { id: string; name: string; deviceType: string | null; backedUp: boolean; createdAt: string; lastUsedAt: string | null };

type Copy = Record<string, any> & {
  stepUp: StepUpCopy;
  nav: Record<string, string>;
  permissionNames: Record<string, string>;
  permissionStates: Record<string, string>;
  notificationNames: Record<string, string>;
};

const sectionIcons: Record<string, typeof Palette> = {
  appearance: Palette, notifications: Bell, privacy: Eye, permissions: Video,
  security: Shield, devices: MonitorSmartphone, sessions: LockKeyhole,
  passkeys: KeyRound, account: UserRound, help: HelpCircle, legal: Languages,
};

function applyAppearance(theme: string, font: string) {
  document.documentElement.dataset.uiTheme = theme.toLowerCase();
  document.documentElement.dataset.uiFont = font.toLowerCase();
  localStorage.setItem("popwam_ui_theme", theme);
  localStorage.setItem("popwam_ui_font", font);
}

export function SettingsCenter({ section, locale, copy }: { section: Section; locale: "ar" | "en"; copy: Copy }) {
  const [preferences, setPreferences] = useState<PreferenceState | null>(null);
  const [notifications, setNotifications] = useState<NotificationState | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [stepUp, setStepUp] = useState<{ purpose: StepUpPurpose; action: (grant: string) => Promise<void> } | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneChallenge, setPhoneChallenge] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [permissions, setPermissions] = useState<Record<string, string>>({});

  const navigation = useMemo(() => [
    ["appearance", copy.nav.appearance], ["notifications", copy.nav.notifications], ["privacy", copy.nav.privacy],
    ["permissions", copy.nav.permissions], ["security", copy.nav.security], ["account", copy.nav.account],
    ["help", copy.nav.help], ["legal", copy.nav.legal],
  ] as const, [copy]);

  async function load() {
    setLoading(true); setMessage("");
    try {
      const [p, n, o, d, s, k] = await Promise.all([
        fetch("/api/settings/preferences").then(response => response.json()),
        fetch("/api/settings/notifications").then(response => response.json()),
        fetch("/api/security/overview").then(response => response.json()),
        fetch("/api/security/devices").then(response => response.json()),
        fetch("/api/security/sessions").then(response => response.json()),
        fetch("/api/security/passkeys").then(response => response.json()),
      ]);
      setPreferences(p);
      applyAppearance(p.theme || "SYSTEM", p.font || "DEFAULT");
      setNotifications(n.preferences);
      setOverview(o);
      setDevices(d.devices || []);
      setSessions(s.sessions || []);
      setPasskeys(k.passkeys || []);
    } catch {
      setMessage(copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const event = section === "devices"
      ? "devices_viewed"
      : section === "passkeys"
        ? "passkey_management_opened"
        : section === "security" || section === "sessions"
          ? "security_viewed"
          : "settings_viewed";
    void trackFirebaseAnalyticsEvent(event, { platform: "web", setting_category: section });
  }, [section]);

  useEffect(() => {
    if (section !== "permissions") return;
    const inspect = async () => {
      const result: Record<string, string> = {};
      const query = async (name: string) => {
        try {
          const status = await navigator.permissions.query({ name: name as PermissionName });
          return status.state === "granted" ? "ALLOWED" : status.state === "denied" ? "DENIED" : "NOT_REQUESTED";
        } catch { return "UNAVAILABLE"; }
      };
      result.camera = await query("camera");
      result.location = await query("geolocation");
      result.notifications = typeof Notification === "undefined" ? "UNAVAILABLE" : Notification.permission === "granted" ? "ALLOWED" : Notification.permission === "denied" ? "DENIED" : "NOT_REQUESTED";
      result.nfc = "NDEFReader" in window ? "NOT_REQUESTED" : "UNAVAILABLE";
      result.contacts = "UNAVAILABLE";
      setPermissions(result);
    };
    void inspect();
  }, [section]);

  async function patchPreference(patch: Record<string, unknown>) {
    const response = await fetch("/api/settings/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    const result = await response.json();
    if (!response.ok) throw new Error();
    setPreferences(result);
    setMessage(copy.saved);
  }

  async function chooseAppearance(key: "theme" | "font", value: string) {
    if (!preferences) return;
    applyAppearance(key === "theme" ? value : preferences.theme, key === "font" ? value : preferences.font);
    await patchPreference({ [key]: value });
    void trackFirebaseAnalyticsEvent("appearance_changed", { platform: "web", setting_category: key, outcome: "success" });
  }

  async function chooseLanguage(value: string) {
    await patchPreference({ language: value });
    if (value === "ARABIC" || value === "ENGLISH") {
      await fetch("/api/locale", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale: value === "ARABIC" ? "ar" : "en" }) });
      window.location.reload();
    }
  }

  async function patchNotification(key: keyof NotificationState, value: boolean) {
    const response = await fetch("/api/settings/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ [key]: value }) });
    const result = await response.json();
    if (!response.ok) throw new Error();
    setNotifications(result.preferences);
    setMessage(copy.saved);
    void trackFirebaseAnalyticsEvent("notification_preference_changed", { platform: "web", setting_category: key, outcome: "success" });
  }

  function requireStepUp(purpose: StepUpPurpose, action: (grant: string) => Promise<void>) {
    setStepUp({ purpose, action });
  }

  async function revokeSession(session: SecuritySession, grant: string) {
    const response = await fetch(`/api/security/sessions/${encodeURIComponent(session.id)}`, { method: "DELETE", headers: { "x-pop-step-up": grant } });
    if (!response.ok) throw new Error();
    void trackFirebaseAnalyticsEvent("session_revoked", { platform: "web", outcome: "success" });
    if (session.current) await signOut({ callbackUrl: "/login" });
    else await load();
  }

  async function revokeOthers(grant: string) {
    const response = await fetch("/api/security/sessions/revoke-others", { method: "POST", headers: { "x-pop-step-up": grant } });
    if (!response.ok) throw new Error();
    setMessage(copy.othersRevoked);
    await load();
  }

  async function revokeAll(grant: string) {
    const response = await fetch("/api/security/sessions/revoke-all", { method: "POST", headers: { "x-pop-step-up": grant } });
    if (!response.ok) throw new Error();
    await signOut({ callbackUrl: "/login" });
  }

  async function addPasskey(grant?: string) {
    const optionsResponse = await fetch("/api/passkeys/register/options", { method: "POST", headers: grant ? { "x-pop-step-up": grant } : undefined });
    if (optionsResponse.status === 428 && !grant) {
      requireStepUp("ADD_PASSKEY", token => addPasskey(token));
      return;
    }
    const options = await optionsResponse.json();
    if (!optionsResponse.ok) throw new Error();
    const response = await startRegistration({ optionsJSON: options });
    const verify = await fetch("/api/passkeys/register/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(response) });
    if (!verify.ok) throw new Error();
    await load();
  }

  async function removePasskey(item: Passkey, grant: string) {
    const response = await fetch(`/api/security/passkeys/${encodeURIComponent(item.id)}`, { method: "DELETE", headers: { "x-pop-step-up": grant } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    await load();
  }

  async function beginPhoneChange(grant: string) {
    const response = await fetch("/api/security/account/phone/change/start", {
      method: "POST",
      headers: { "content-type": "application/json", "x-pop-step-up": grant },
      body: JSON.stringify({ phone, locale }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error();
    setPhoneChallenge(result.challengeId);
    setMessage(`${copy.codeSent} ${result.maskedPhone}`);
  }

  async function verifyPhone() {
    const response = await fetch("/api/security/account/phone/change/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ challengeId: phoneChallenge, code: phoneCode }),
    });
    if (!response.ok) throw new Error();
    setPhone(""); setPhoneCode(""); setPhoneChallenge(""); setMessage(copy.phoneChanged);
    await load();
  }

  async function requestDeletion(grant: string) {
    const response = await fetch("/api/security/account/deletion-request", { method: "POST", headers: { "x-pop-step-up": grant } });
    if (!response.ok) throw new Error();
    setMessage(copy.deletionRequested);
  }

  const status = (value: string) => <span className="rounded-full bg-white/[.07] px-2.5 py-1 text-xs font-semibold">{copy[value.toLowerCase()] || value}</span>;
  const date = (value: string | null) => value ? new Date(value).toLocaleString(locale) : copy.never;
  const pageTitle = copy.nav[section] || copy.title;

  return <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
    <aside className="card h-fit p-3" aria-label={copy.settingsNavigation}>
      <Link href="/dashboard/settings" className="mb-2 block rounded-xl px-3 py-3 text-lg font-black">POP {copy.title}</Link>
      <nav className="grid gap-1">
        {navigation.map(([key, label]) => {
          const Icon = sectionIcons[key];
          return <Link key={key} href={`/dashboard/settings/${key}`} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold ${section === key ? "bg-brand-500/15 text-brand-300" : "text-slate-400 hover:bg-white/[.05] hover:text-white"}`}><Icon size={18}/><span className="flex-1">{label}</span><ChevronRight className="directional-icon" size={16}/></Link>;
        })}
      </nav>
    </aside>
    <main className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-400">{copy.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black">{pageTitle}</h1>
      <p className="mt-2 max-w-3xl text-slate-400">{copy[`${section}Help`] || copy.description}</p>
      {message && <p role="status" className="mt-4 rounded-xl border border-brand-400/20 bg-brand-500/10 p-3 text-sm">{message}</p>}
      {loading ? <p className="mt-8 text-slate-400">{copy.loading}</p> : <div className="mt-7">
        {section === "root" && <div className="grid gap-4 sm:grid-cols-2">{navigation.map(([key, label]) => { const Icon = sectionIcons[key]; return <Link href={`/dashboard/settings/${key}`} key={key} className="card flex min-h-28 items-center gap-4 p-5 hover:bg-white/[.07]"><Icon className="text-brand-400"/><div><h2 className="font-bold">{label}</h2><p className="mt-1 text-sm text-slate-500">{copy[`${key}Short`]}</p></div></Link>; })}</div>}
        {section === "appearance" && preferences && <div className="space-y-5">
          <ChoiceCard title={copy.theme} value={preferences.theme} choices={[["SYSTEM", copy.system], ["LIGHT", copy.light], ["DARK", copy.dark]]} onChange={value => void chooseAppearance("theme", value)}/>
          <ChoiceCard title={copy.language} value={preferences.language} choices={[["SYSTEM", copy.system], ["ENGLISH", copy.english], ["ARABIC", copy.arabic]]} onChange={value => void chooseLanguage(value)}/>
          <ChoiceCard title={copy.font} value={preferences.font} choices={[["DEFAULT", copy.productDefault], ["CAIRO", "Cairo"], ["ABEEZEE", "ABeeZee"]]} onChange={value => void chooseAppearance("font", value)}/>
          <p className="text-sm text-slate-500">{copy.accessibilityScale}</p>
        </div>}
        {section === "notifications" && notifications && <div className="space-y-4">
          <div className="card p-5"><h2 className="font-bold">{copy.osNotificationPermission}</h2><p className="mt-2 text-sm text-slate-400">{copy.osPermissionHelp}</p></div>
          {(["generalEnabled", "securityEnabled", "productsEnabled", "socialEnabled", "marketingEnabled"] as const).map(key => <ToggleRow key={key} label={copy.notificationNames[key]} checked={notifications[key]} onChange={value => void patchNotification(key, value)}/>)}
          <p className="text-sm text-slate-500">{copy.notificationDeliveryFoundation}</p>
        </div>}
        {section === "privacy" && preferences && <div className="space-y-4">
          <ToggleRow label={copy.shareActivityIdentity} checked={preferences.privacy.shareActivityIdentity} onChange={value => void patchPreference({ shareActivityIdentity: value })}/>
          <InfoRow label={copy.profileVisibility} value={preferences.privacy.profileVisibility}/>
          <InfoRow label={copy.blockedUsers} value={String(preferences.privacy.blockedUsers)}/>
          <InfoRow label={copy.nearby} value={preferences.privacy.nearby.enabled ? copy.enabled : preferences.privacy.nearby.available ? copy.disabled : copy.unavailable}/>
          <Link className="btn-secondary" href="/dashboard/nearby">{copy.manageNearby}</Link>
          <Link className="btn-secondary" href="/dashboard/friends?tab=privacy">{copy.manageFriendsPrivacy}</Link>
          <Link className="btn-secondary" href="/dashboard/friends?tab=blocked">{copy.manageBlockedUsers}</Link>
          <Link className="btn-secondary" href="/dashboard/profile/publish">{copy.manageProfilePrivacy}</Link>
        </div>}
        {section === "permissions" && <div className="space-y-3">{["camera", "nfc", "location", "notifications", "contacts"].map(key => <InfoRow key={key} label={copy.permissionNames[key]} value={copy.permissionStates[permissions[key] || "UNAVAILABLE"]}/>)}
          <p className="mt-4 text-sm text-slate-500">{copy.permissionsNoRequest}</p>
        </div>}
        {section === "security" && overview && <div className="grid gap-4 sm:grid-cols-2">
          <SecurityCard href="/dashboard/settings/passkeys" title={copy.nav.passkeys} value={overview.passkey.configured ? `${overview.passkey.count} ${copy.configured}` : copy.notSetUp}/>
          <SecurityCard href="/dashboard/settings/devices" title={copy.nav.devices} value={`${overview.devices.active} ${copy.active}`}/>
          <SecurityCard href="/dashboard/settings/sessions" title={copy.nav.sessions} value={`${overview.sessions.active} ${copy.active}`}/>
          <SecurityCard href="/dashboard/settings/account" title={copy.recovery} value={overview.recovery.phoneVerified ? copy.phoneVerified : copy.recoveryUnavailable}/>
        </div>}
        {section === "devices" && <div className="space-y-3">{devices.map(device => <article className="card p-5" key={device.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{device.label}</h2><p className="mt-1 text-sm text-slate-400">{device.platform} · {device.appName}{device.appVersion ? ` ${device.appVersion}` : ""}</p></div>{status(device.status)}</div><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">{copy.lastActive}</dt><dd>{date(device.lastActiveAt)}</dd></div><div><dt className="text-slate-500">{copy.authMethod}</dt><dd>{device.authMethod}</dd></div><div><dt className="text-slate-500">{copy.pushStatus}</dt><dd>{device.pushEnabled ? copy.enabled : copy.disabled}</dd></div><div><dt className="text-slate-500">{copy.sessionCount}</dt><dd>{device.activeSessionCount}</dd></div></dl></article>)}{!devices.length && <Empty text={copy.onlyThisDevice}/>}</div>}
        {section === "sessions" && <div className="space-y-4">
          <div className="flex flex-wrap gap-3"><button className="btn-secondary" onClick={() => { if (confirm(copy.confirmOthers)) requireStepUp("REVOKE_OTHER_SESSIONS", revokeOthers); }}>{copy.signOutOthers}</button><button className="btn-danger" onClick={() => { if (confirm(copy.confirmEverywhere)) requireStepUp("SECURITY_SETTINGS", revokeAll); }}>{copy.signOutEverywhere}</button></div>
          {sessions.map(session => <article className="card p-5" key={session.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{session.label}</h2><p className="mt-1 text-sm text-slate-400">{session.authority} · {session.appName}</p></div>{status(session.status)}</div><p className="mt-3 text-sm text-slate-500">{copy.lastActive}: {date(session.lastActiveAt)} · {copy.authMethod}: {session.authMethod}</p><button className="btn-danger mt-4" onClick={() => { if (confirm(session.current ? copy.confirmCurrent : copy.confirmRevoke)) requireStepUp("REVOKE_SESSION", grant => revokeSession(session, grant)); }}>{session.current ? copy.signOutThisDevice : copy.revoke}</button></article>)}
          {!sessions.length && <Empty text={copy.onlyThisDevice}/>}
        </div>}
        {section === "passkeys" && <div className="space-y-4"><button className="btn-primary" onClick={() => void addPasskey()}><KeyRound size={17}/>{copy.addPasskey}</button>{passkeys.map(item => <article className="card flex flex-wrap items-center justify-between gap-4 p-5" key={item.id}><div><h2 className="font-bold">{item.name}</h2><p className="mt-1 text-sm text-slate-500">{copy.created}: {date(item.createdAt)} · {copy.lastUsed}: {date(item.lastUsedAt)}</p></div><button className="btn-danger" onClick={() => { if (confirm(copy.confirmRemovePasskey)) requireStepUp("REMOVE_PASSKEY", grant => removePasskey(item, grant)); }}>{copy.removePasskey}</button></article>)}{!passkeys.length && <Empty text={copy.noPasskeys}/>}</div>}
        {section === "account" && <div className="space-y-5">
          <section className="card p-5"><h2 className="font-bold">{copy.changePhone}</h2><p className="mt-2 text-sm text-slate-400">{copy.changePhoneHelp}</p>{!phoneChallenge ? <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input className="input" type="tel" dir="ltr" value={phone} onChange={event => setPhone(event.target.value.slice(0, 32))} placeholder={copy.newPhone}/><button className="btn-primary shrink-0" disabled={!phone.trim()} onClick={() => requireStepUp("CHANGE_PHONE", beginPhoneChange)}>{copy.continue}</button></div> : <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input className="input ltr-token" inputMode="numeric" autoComplete="one-time-code" value={phoneCode} onChange={event => setPhoneCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={copy.code}/><button className="btn-primary shrink-0" disabled={phoneCode.length !== 6} onClick={() => void verifyPhone()}>{copy.verify}</button></div>}</section>
          <section className="card border-red-400/20 p-5"><h2 className="font-bold text-red-300">{copy.deleteAccount}</h2><p className="mt-2 text-sm text-slate-400">{copy.deleteAccountHelp}</p><button className="btn-danger mt-4" onClick={() => { if (confirm(copy.confirmDeletion)) requireStepUp("DELETE_ACCOUNT", requestDeletion); }}>{copy.requestDeletion}</button></section>
        </div>}
        {section === "help" && <div className="card p-5"><Link className="btn-secondary" href="/ideas">{copy.openHelp}</Link></div>}
        {section === "legal" && <div className="flex flex-wrap gap-3"><Link className="btn-secondary" href="/terms">{copy.terms}</Link><Link className="btn-secondary" href="/privacy">{copy.privacyPolicy}</Link></div>}
      </div>}
    </main>
    {stepUp && <StepUpDialog open purpose={stepUp.purpose} locale={locale} copy={copy.stepUp} onClose={() => setStepUp(null)} onVerified={async grant => { try { await stepUp.action(grant); } catch { setMessage(copy.actionFailed); throw new Error(); } }}/>}
  </div>;
}

function ChoiceCard({ title, value, choices, onChange }: { title: string; value: string; choices: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return <fieldset className="card p-5"><legend className="px-1 font-bold">{title}</legend><div className="mt-3 grid gap-2 sm:grid-cols-3">{choices.map(([key, label]) => <label key={key} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 ${value === key ? "border-brand-400 bg-brand-500/10" : "border-white/10"}`}><input type="radio" checked={value === key} onChange={() => onChange(key)}/><span>{label}</span></label>)}</div></fieldset>;
}
function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="card flex min-h-16 cursor-pointer items-center justify-between gap-4 p-4"><span className="font-semibold">{label}</span><input className="size-5 accent-brand-500" type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)}/></label>;
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="card flex min-h-16 items-center justify-between gap-4 p-4"><span className="font-semibold">{label}</span><span className="text-sm text-slate-400">{value}</span></div>;
}
function SecurityCard({ href, title, value }: { href: string; title: string; value: string }) {
  return <Link href={href} className="card flex min-h-28 items-center justify-between gap-4 p-5 hover:bg-white/[.07]"><div><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm text-slate-400">{value}</p></div><ChevronRight className="directional-icon text-slate-500"/></Link>;
}
function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-400">{text}</p>; }
