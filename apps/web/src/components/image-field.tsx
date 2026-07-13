"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

export function ImageField({ type, initialUrl, initialKey, storageEnabled }: { type: "avatar" | "cover"; initialUrl?: string | null; initialKey?: string | null; storageEnabled: boolean }) {
  const [url, setUrl] = useState(initialUrl || "");
  const [key, setKey] = useState(initialKey || "");
  const [status, setStatus] = useState("");
  async function upload(file?: File) {
    if (!file) return; setStatus("Uploading…");
    const body = new FormData(); body.set("file", file);
    const response = await fetch(`/api/upload/${type}`, { method: "POST", body });
    const result = await response.json();
    if (!response.ok) { setStatus(result.error || "Upload failed."); return; }
    setUrl(result.url); setKey(result.key); setStatus("Uploaded. Save the profile to apply it.");
  }
  return <div>
    <label className="label">{type === "avatar" ? "Avatar" : "Cover image"} URL</label>
    <input className="input" name={`${type}Url`} value={url} onChange={(event) => { setUrl(event.target.value); if (event.target.value !== initialUrl) setKey(""); }} placeholder="https://…"/>
    <input type="hidden" name={`${type}StorageKey`} value={key}/>
    {storageEnabled && <label className="btn-secondary mt-2 cursor-pointer"><Upload size={15}/> Upload {type}<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])}/></label>}
    {status && <p className="mt-2 text-xs text-slate-400">{status}</p>}
  </div>;
}
