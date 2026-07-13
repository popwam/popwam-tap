"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export function PwaClient({ installLabel }: { installLabel: string }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const listener = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", listener); return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);
  if (!prompt) return null;
  return <button className="btn-primary fixed bottom-4 end-4 z-50 shadow-xl" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }}><Download size={16}/>{installLabel}</button>;
}
