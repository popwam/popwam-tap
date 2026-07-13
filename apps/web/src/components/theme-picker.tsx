"use client";

import { useState } from "react";
import type { ProfileTheme } from "@popwam/db";
import { Check } from "lucide-react";
import { THEME_TOKENS } from "@/lib/themes";

const themes=Object.keys(THEME_TOKENS) as ProfileTheme[];
export function ThemePicker({current,canChange,labels}:{current:ProfileTheme;canChange:boolean;labels:Record<ProfileTheme,string>}){
  const [selected,setSelected]=useState(current);const token=THEME_TOKENS[selected];
  return <div><input type="hidden" name="theme" value={selected}/><div className="grid gap-3 sm:grid-cols-2">{themes.map(theme=>{const t=THEME_TOKENS[theme],active=theme===selected;return <button type="button" disabled={!canChange} onClick={()=>setSelected(theme)} aria-pressed={active} key={theme} className={`relative overflow-hidden border p-3 text-start transition ${active?"border-brand-400 ring-2 ring-brand-400/20":"border-white/10"}`} style={{borderRadius:t.radius,background:t.background,color:t.text}}><div className="h-16 p-3" style={{background:t.panel,borderRadius:Math.max(10,t.radius-8)}}><div className="h-2 w-1/2 rounded" style={{background:t.accent}}/><div className="mt-2 h-2 w-4/5 rounded bg-current opacity-20"/></div><div className="mt-3 flex items-center justify-between"><strong className="text-sm">{labels[theme]}</strong>{active&&<span className="flex size-6 items-center justify-center rounded-full bg-brand-400 text-black"><Check size={14}/></span>}</div></button>;})}</div><div className="mt-5 overflow-hidden border border-white/10 p-5" style={{background:token.background,color:token.text,borderRadius:token.radius}}><p className="mb-3 text-xs opacity-60">Live preview</p><div className="p-5" style={{background:token.panel,borderRadius:token.radius}}><div className="flex items-center gap-3"><div className="size-12 rounded-full" style={{background:token.accent}}/><div><div className="h-3 w-28 rounded bg-current"/><div className="mt-2 h-2 w-20 rounded bg-current opacity-30"/></div></div><button type="button" className="mt-5 px-5 py-2 text-sm font-bold" style={{background:token.accent,borderRadius:token.buttonRadius,color:token.background}}>POPWAM Tap</button></div></div>{!canChange&&<p className="mt-3 text-sm text-amber-300">Your current plan lets you view this theme but not change it.</p>}</div>;
}
