"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";

export function LocaleSwitcher({ locale, label }: { locale: "ar" | "en"; label: string }) {
  const [pending, setPending] = useState(false); const router = useRouter();
  async function toggle() { setPending(true); await fetch("/api/locale", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale: locale === "ar" ? "en" : "ar" }) }); router.refresh(); setPending(false); }
  return <button type="button" onClick={toggle} disabled={pending} className="btn-secondary"><Languages size={16}/>{label}</button>;
}
