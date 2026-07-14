"use client";
import { useState } from "react";
import { Send } from "lucide-react";

export function AdminSmsTestForm() {
  const [phone, setPhone] = useState(""); const [pending, setPending] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setMessage("");
    const response = await fetch("/api/admin/sms/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) });
    const result = await response.json().catch(() => ({})); setPending(false);
    setMessage(response.ok ? result.testBypass ? "تم تنفيذ مسار الاختبار المسموح دون الاتصال بـSMS Misr ودون عرض الرمز." : "تم إرسال رسالة الاختبار وتسجيل النتيجة دون عرض الرمز." : result.error === "RATE_LIMITED" ? "تم بلوغ حد الإرسال لهذا الرقم. حاول لاحقًا." : "تعذر إرسال رسالة الاختبار. راجع حالة المزود.");
    if (response.ok) setPhone("");
  }
  return <form onSubmit={submit} className="card p-5"><h2 className="font-bold">اختبار إرسال آمن</h2><p className="mt-2 text-sm text-slate-400">أدخل رقمًا مصريًا. يُولد الرمز في الخادم ولا يظهر هنا أو في السجلات.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input className="input" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={phone} onChange={event => setPhone(event.target.value)} required/><button className="btn-primary shrink-0" disabled={pending}><Send size={16}/>{pending ? "جارٍ الإرسال…" : "إرسال Test SMS"}</button></div>{message && <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200">{message}</p>}</form>;
}
