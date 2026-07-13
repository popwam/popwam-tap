"use client";

import { useState } from "react";
export function ProfileSaveForm({action,children,saveLabel}:{action:(data:FormData)=>Promise<void>;children:React.ReactNode;saveLabel:string}){const [dirty,setDirty]=useState(false);return <form action={action} onChange={()=>setDirty(true)} className="space-y-4">{children}<div className="sticky bottom-4 z-30 flex items-center justify-between rounded-2xl border border-white/10 bg-ink/90 p-3 shadow-2xl backdrop-blur"><span className={`text-sm ${dirty?"text-amber-300":"text-slate-500"}`}>{dirty?"Unsaved changes":"All changes saved"}</span><button className="btn-primary" onClick={()=>setDirty(false)}>{saveLabel}</button></div></form>;}
