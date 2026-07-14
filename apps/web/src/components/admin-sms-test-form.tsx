"use client";
import { useState } from "react";
import { Send } from "lucide-react";

type Copy={formTitle:string;formDescription:string;send:string;sending:string;bypassed:string;sent:string;rateLimited:string;failed:string};
export function AdminSmsTestForm({copy}:{copy:Copy}) {
  const [phone, setPhone] = useState(""); const [pending, setPending] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setMessage("");
    const response = await fetch("/api/admin/sms/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) });
    const result = await response.json().catch(() => ({})); setPending(false);
    setMessage(response.ok ? result.testBypass ? copy.bypassed : copy.sent : result.error === "RATE_LIMITED" ? copy.rateLimited : copy.failed);
    if (response.ok) setPhone("");
  }
  return <form onSubmit={submit} className="card p-5"><h2 className="font-bold">{copy.formTitle}</h2><p className="mt-2 text-sm text-slate-400">{copy.formDescription}</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input className="input" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={phone} onChange={event => setPhone(event.target.value)} required/><button className="btn-primary shrink-0" disabled={pending}><Send size={16}/>{pending?copy.sending:copy.send}</button></div>{message&&<p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200">{message}</p>}</form>;
}
