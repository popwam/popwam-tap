"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";

export function QrCard({ value, name, compact = false }: { value: string; name: string; compact?: boolean }) {
  const wrapper = useRef<HTMLDivElement>(null);
  function download() {
    const canvas = wrapper.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`;
    link.href = canvas.toDataURL("image/png"); link.click();
  }
  return <div className={compact ? "flex items-center gap-3" : "space-y-4 text-center"}>
    <div ref={wrapper} className="inline-flex rounded-2xl bg-white p-3"><QRCodeCanvas value={value} size={compact ? 92 : 220} level="H" marginSize={1}/></div>
    <button type="button" onClick={download} className={compact ? "btn-secondary p-2" : "btn-secondary w-full"} title="Download QR PNG"><Download size={15}/>{!compact && " Download PNG"}</button>
  </div>;
}
