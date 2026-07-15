"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{outcome:"accepted"|"dismissed"}> };
export function ProfileInstallButton({name,locale}:{name:string;locale:"ar"|"en"}){
  const [prompt,setPrompt]=useState<InstallPrompt|null>(null);const [help,setHelp]=useState(false);const [visible,setVisible]=useState(false);const ar=locale==="ar";
  useEffect(()=>{if(window.matchMedia("(display-mode: standalone)").matches)return;const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);if(ios)setVisible(true);const handler=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt);setVisible(true)};const installed=()=>setVisible(false);window.addEventListener("beforeinstallprompt",handler);window.addEventListener("appinstalled",installed);return()=>{window.removeEventListener("beforeinstallprompt",handler);window.removeEventListener("appinstalled",installed)}},[]);
  async function install(){if(prompt){await prompt.prompt();const result=await prompt.userChoice;if(result.outcome==="accepted")setVisible(false);setPrompt(null);return}setHelp(true)}
  if(!visible)return null;
  return <div className="mt-4"><button type="button" onClick={install} className="profile-button flex w-full items-center justify-center gap-2"><Download size={16}/>{ar?`إضافة ${name} إلى الشاشة الرئيسية`:`Add ${name} to Home Screen`}</button>{help&&<p className="profile-muted mt-3 rounded-xl border border-[var(--profile-border)] p-3 text-xs leading-6">{ar?"على iPhone أو iPad: المشاركة ← إضافة إلى الشاشة الرئيسية.":"On iPhone or iPad: Share → Add to Home Screen."}</p>}</div>;
}
