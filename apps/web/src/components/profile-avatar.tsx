"use client";

import { useEffect, useMemo, useState } from "react";

const palette = [["#0f766e","#99f6e4"],["#1d4ed8","#bfdbfe"],["#7e22ce","#e9d5ff"],["#be123c","#fecdd3"],["#a16207","#fef3c7"],["#0369a1","#bae6fd"]] as const;

export function avatarInitials(name?: string | null, email?: string | null) { const words=(name?.trim()||"").split(/\s+/u).filter(Boolean);if(words.length){const chosen=words.length===1?[words[0]]:[words[0],words[words.length-1]];return chosen.map(word=>Array.from(word)[0]||"").join("").toLocaleUpperCase();}const source=email?.trim()||"P";return Array.from(source)[0]?.toLocaleUpperCase()||"P"; }
export const avatarLetter = avatarInitials;

export function ProfileAvatar({ name, email, imageUrl, size = 48, className = "", variant = "circle" }: { name?: string | null; email?: string | null; imageUrl?: string | null; size?: number; className?: string; variant?: "circle"|"rounded" }) {
  const [failed,setFailed] = useState(false); useEffect(() => setFailed(false),[imageUrl]); const seed = `${name || ""}|${email || ""}`;
  const colors = useMemo(() => { let hash=0; for (const char of Array.from(seed)) hash=((hash<<5)-hash+(char.codePointAt(0)||0))|0; return palette[Math.abs(hash)%palette.length]; },[seed]);
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${variant==="circle"?"rounded-full":"rounded-2xl"} font-black shadow-lg ring-2 ring-white/10 ${className}`} style={{ width:size,height:size,background:colors[0],color:colors[1],fontSize:Math.max(14,size*.38) }} aria-label={name || email || "POPWAM profile"}>{imageUrl && !failed ? <img src={imageUrl} alt="" className="size-full object-cover" onError={() => setFailed(true)}/> : avatarInitials(name,email)}</span>;
}
