"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import { trackFirebaseAnalyticsEvent } from "@/lib/firebase/analytics";

type RelationshipState = "NONE" | "OUTGOING_PENDING" | "INCOMING_PENDING" | "FRIENDS" | "BLOCKED_BY_ME" | "UNAVAILABLE";
type Copy = Record<string, string>;

export function FriendProfileAction({ profileSlug, copy }: { profileSlug: string; copy: Copy }) {
  const [state, setState] = useState<RelationshipState | null>(null);
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/friends/relationship?profile=${encodeURIComponent(profileSlug)}`, {
      cache: "no-store",
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return;
      const result = await response.json();
      setState(result.state);
      setTargetKey(result.target?.key || null);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [profileSlug]);

  async function requestFriend() {
    if (!targetKey || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetKey, source: "PROFILE" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "FRIENDS_REQUEST_FAILED");
      setState(result.state);
      void trackFirebaseAnalyticsEvent("friend_request_sent", {
        platform: "web",
        outcome: result.idempotent ? "idempotent" : "success",
        relationship_state: result.state,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "FRIENDS_REQUEST_FAILED");
    } finally {
      setBusy(false);
    }
  }

  if (!state || state === "UNAVAILABLE") return null;
  if (state === "NONE") return <div className="mt-4">
    <button className="profile-button flex min-h-12 w-full items-center justify-center gap-2" disabled={busy} onClick={() => void requestFriend()}>
      <UserPlus size={17}/>{busy ? copy.loading : copy.request}
    </button>
    {error && <p className="mt-2 text-center text-xs text-red-300" role="alert">{copy.actionFailed}</p>}
  </div>;
  if (state === "FRIENDS") return <div className="profile-item mt-4 flex min-h-12 items-center justify-center gap-2 rounded-[var(--item-radius)] px-4 text-sm font-semibold"><UserCheck size={17}/>{copy.friendsState}</div>;
  if (state === "BLOCKED_BY_ME") return <Link className="profile-button mt-4 flex min-h-12 items-center justify-center" href="/dashboard/friends?tab=blocked">{copy.blocked}</Link>;
  return <Link className="profile-button mt-4 flex min-h-12 items-center justify-center" href="/dashboard/friends?tab=requests">{state === "INCOMING_PENDING" ? copy.incoming : copy.requested}</Link>;
}
