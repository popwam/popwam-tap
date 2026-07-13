"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyUrl({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return <button type="button" onClick={copy} title="Copy URL" className="shrink-0 text-slate-500 hover:text-white">{copied ? <Check size={14} className="text-brand-400"/> : <Copy size={14}/>}</button>;
}
