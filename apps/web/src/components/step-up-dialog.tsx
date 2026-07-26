"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useEffect, useRef, useState } from "react";

export type StepUpPurpose =
  | "CHANGE_PHONE" | "DELETE_ACCOUNT" | "ADD_PASSKEY" | "REMOVE_PASSKEY"
  | "REVOKE_SESSION" | "REVOKE_OTHER_SESSIONS" | "PRODUCT_LOST"
  | "PRODUCT_TRANSFER" | "SECURITY_SETTINGS" | "LINK_DEVICE_APPROVAL";

export type StepUpCopy = {
  verifyTitle: string;
  verifyHelp: string;
  passkey: string;
  phone: string;
  code: string;
  verify: string;
  cancel: string;
  unavailable: string;
  invalid: string;
  sentTo: string;
  loading: string;
};

export function StepUpDialog({
  open,
  purpose,
  locale,
  copy,
  onClose,
  onVerified,
}: {
  open: boolean;
  purpose: StepUpPurpose;
  locale: "ar" | "en";
  copy: StepUpCopy;
  onClose: () => void;
  onVerified: (grantToken: string, method: "PASSKEY" | "OTP") => void | Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [methods, setMethods] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!open) {
      dialog.current?.close();
      return;
    }
    setMethods([]); setError(""); setChallengeId(""); setCode("");
    dialog.current?.showModal();
    void fetch("/api/security/step-up/options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose }),
    }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error();
      setMethods(result.methods || []);
    }).catch(() => setError(copy.unavailable));
  }, [copy.unavailable, open, purpose]);

  async function complete(result: { grantToken?: string; method?: "PASSKEY" | "OTP" }) {
    if (!result.grantToken || !result.method) throw new Error();
    await onVerified(result.grantToken, result.method);
    onClose();
  }

  async function usePasskey() {
    setPending(true); setError("");
    try {
      const optionResponse = await fetch("/api/security/step-up/options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purpose, method: "PASSKEY" }),
      });
      const optionResult = await optionResponse.json();
      if (!optionResponse.ok || !optionResult.options) throw new Error();
      const assertion = await startAuthentication({ optionsJSON: optionResult.options });
      const response = await fetch("/api/security/step-up/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purpose, method: "PASSKEY", assertion }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error();
      await complete(result);
    } catch {
      setError(copy.invalid);
    } finally {
      setPending(false);
    }
  }

  async function usePhone() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/security/step-up/options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purpose, method: "OTP", locale }),
      });
      const result = await response.json();
      if (!response.ok || !result.challengeId) throw new Error();
      setChallengeId(result.challengeId);
      setMaskedPhone(result.maskedPhone || "");
    } catch {
      setError(copy.unavailable);
    } finally {
      setPending(false);
    }
  }

  async function verifyPhone(event: React.FormEvent) {
    event.preventDefault();
    if (code.length !== 6) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/security/step-up/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purpose, method: "OTP", challengeId, code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error();
      await complete(result);
    } catch {
      setError(copy.invalid);
    } finally {
      setPending(false);
    }
  }

  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} className="w-[min(92vw,30rem)] rounded-3xl border border-white/10 bg-slate-950 p-0 text-white shadow-2xl backdrop:bg-black/70">
    <div className="p-6">
      <h2 className="text-xl font-black">{copy.verifyTitle}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{copy.verifyHelp}</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {!challengeId ? <div className="mt-6 grid gap-3">
        {methods.includes("PASSKEY") && <button type="button" className="btn-primary min-h-12" disabled={pending} onClick={usePasskey}>{copy.passkey}</button>}
        {methods.includes("OTP") && <button type="button" className="btn-secondary min-h-12" disabled={pending} onClick={usePhone}>{copy.phone}</button>}
        {!methods.length && !error && <p role="status" className="text-sm text-slate-400">{copy.loading}</p>}
      </div> : <form className="mt-6" onSubmit={verifyPhone}>
        <p className="mb-3 text-sm text-slate-400">{copy.sentTo} <bdi dir="ltr">{maskedPhone}</bdi></p>
        <label><span className="label">{copy.code}</span><input className="input ltr-token text-center text-xl tracking-[.35em]" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required pattern="\d{6}"/></label>
        <button className="btn-primary mt-4 min-h-12 w-full" disabled={pending || code.length !== 6}>{copy.verify}</button>
      </form>}
      <button type="button" className="btn-secondary mt-3 min-h-11 w-full" onClick={onClose}>{copy.cancel}</button>
    </div>
  </dialog>;
}
