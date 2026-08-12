"use client";

import { useMemo, useState } from "react";

type UserOption = { id: string; name: string | null; email: string; locale: string | null };

export function AdminNotificationComposer({ action, users }: { action: (data: FormData) => void; users: UserOption[] }) {
  const [audience, setAudience] = useState("TEST");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter(user => !term || user.email.toLowerCase().includes(term) || user.name?.toLowerCase().includes(term)).slice(0, 80);
  }, [query, users]);
  const selectedValue = audience === "SELECTED" ? selected.join(",") : "";
  return <form action={action} className="card grid gap-5 p-5">
    <div className="grid gap-4 lg:grid-cols-3">
      <label><span className="label">Audience</span><select className="input" name="audienceType" value={audience} onChange={event => { setAudience(event.target.value); setSelected([]); }}><option value="TEST">Test — my account</option><option value="USER">One user</option><option value="SELECTED">Selected users</option><option value="SEGMENT">Segment</option></select></label>
      {audience === "USER" && <label className="lg:col-span-2"><span className="label">Recipient</span><select className="input" name="audienceValue" required><option value="">Select user</option>{users.map(user => <option value={user.id} key={user.id}>{user.name || "Unnamed"} · {user.email}</option>)}</select></label>}
      {audience === "SEGMENT" && <label className="lg:col-span-2"><span className="label">Segment</span><select className="input" name="audienceValue" required><option value="ALL_ACTIVE">All active accounts (first 500)</option><option value="LOCALE_EN">English locale</option><option value="LOCALE_AR">Arabic locale</option><option value="PUBLISHED_PROFILE">Has published profile</option></select></label>}
      {audience === "TEST" && <input type="hidden" name="audienceValue" value="self"/>}
      {audience === "SELECTED" && <div className="lg:col-span-2"><input type="hidden" name="audienceValue" value={selectedValue}/><span className="label">Selected recipients ({selected.length})</span><input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search users"/><div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-white/10 p-2">{visible.map(user => <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-white/5" key={user.id}><input type="checkbox" checked={selected.includes(user.id)} onChange={event => setSelected(value => event.target.checked ? [...value, user.id] : value.filter(id => id !== user.id))}/><span className="min-w-0"><b>{user.name || "Unnamed"}</b><small className="ms-2 text-slate-500" dir="ltr">{user.email} · {user.locale || "system"}</small></span></label>)}</div></div>}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <fieldset className="grid gap-3 rounded-xl border border-white/10 p-4"><legend className="px-2 font-bold">English (required fallback)</legend><label><span className="label">Title</span><input className="input" name="titleEn" maxLength={120} required/></label><label><span className="label">Body</span><textarea className="input min-h-28" name="bodyEn" maxLength={500} required/></label></fieldset>
      <fieldset className="grid gap-3 rounded-xl border border-white/10 p-4" dir="rtl"><legend className="px-2 font-bold">العربية</legend><label><span className="label">العنوان</span><input className="input" name="titleAr" maxLength={120}/></label><label><span className="label">النص</span><textarea className="input min-h-28" name="bodyAr" maxLength={500}/></label></fieldset>
    </div>
    <div className="grid gap-4 md:grid-cols-3"><label><span className="label">Preference category</span><select className="input" name="category"><option value="GENERAL">General</option><option value="PRODUCTS">Products</option><option value="SECURITY">Security</option><option value="MARKETING">Marketing</option></select></label><label><span className="label">App destination (optional)</span><input className="input" name="deepLink" placeholder="home, my-profile, menu, profile/{id}"/></label><label><span className="label">HTTPS image URL (optional)</span><input className="input" name="imageUrl" type="url" placeholder="https://…"/></label></div>
    <p className="text-sm text-slate-500">Delivery respects the selected preference category and active device tokens. “Sent” means accepted by FCM for at least one device; it does not claim that a person opened or read it.</p>
    <div className="flex flex-wrap gap-3"><button className="btn-secondary" name="operation" value="draft">Save draft</button><button className="btn-primary" name="operation" value="send" disabled={audience === "SELECTED" && !selected.length}>Send now</button></div>
  </form>;
}
