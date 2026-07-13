"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{outcome:"accepted"|"dismissed"}> };
export function ProfileInstallButton({name,locale}:{name:string;locale:"ar"|"en"}){
  const [prompt,setPrompt]=useState<InstallPrompt|null>(null);const [help,setHelp]=useState(false);const ar=locale==="ar";
  useEffect(()=>{const handler=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)};window.addEventListener("beforeinstallprompt",handler);return()=>window.removeEventListener("beforeinstallprompt",handler)},[]);
  async function install(){if(prompt){await prompt.prompt();await prompt.userChoice;setPrompt(null);return}setHelp(true)}
  return <div className="mt-4"><button type="button" onClick={install} className="profile-button flex w-full items-center justify-center gap-2"><Download size={16}/>{ar?`إضافة ${name} إلى الشاشة الرئيسية`:`Add ${name} to Home Screen`}</button>{help&&<p className="profile-muted mt-3 rounded-xl border border-[var(--profile-border)] p-3 text-xs leading-6">{ar?"على iPhone أو iPad افتح قائمة المشاركة واختر «إضافة إلى الشاشة الرئيسية». وفي المتصفحات الأخرى افتح قائمة المتصفح واختر تثبيت التطبيق.":"On iPhone or iPad, open Share and choose “Add to Home Screen”. In other browsers, open the browser menu and choose Install app."}</p>}</div>;
}
