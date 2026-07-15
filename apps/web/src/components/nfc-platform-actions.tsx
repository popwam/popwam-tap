"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, LockKeyhole, RadioTower, Share2, Smartphone } from "lucide-react";
import { nativeNfcInstructions, webNfcWritingAvailable } from "@/lib/nfc-capabilities";

type NdefReader = { write(message: { records: Array<{ recordType: string; data: string }> }): Promise<void> };

export function NfcPlatformActions({ cardId, permanentUrl }: { cardId: string; permanentUrl: string }) {
  const [isIOS, setIsIOS] = useState(false); const [hasNdef, setHasNdef] = useState(false); const [status, setStatus] = useState("");
  useEffect(() => { setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent)); setHasNdef("NDEFReader" in window); }, []);
  const webNfc = webNfcWritingAvailable({ isIOS, hasNdefReader: hasNdef });
  async function writeWebNfc() { try { const Reader = (window as unknown as { NDEFReader: new () => NdefReader }).NDEFReader; await new Reader().write({ records: [{ recordType: "url", data: permanentUrl }] }); setStatus("Permanent URL written. Read it back with the native app before locking."); } catch { setStatus("Web NFC write failed. Use the mobile app."); } }
  async function share() { if (navigator.share) await navigator.share({ title: "POPWAM Tap", url: permanentUrl }); else { await navigator.clipboard.writeText(permanentUrl); setStatus("URL copied."); } }
  function lockTag(){if(window.confirm("Locking an NFC tag is permanent and cannot be undone. Test the written URL first. Continue?"))window.location.href=`popwamtap://lock-tag/${cardId}`;}
  return <div className="grid gap-3 sm:grid-cols-2"><button className="btn-secondary" onClick={() => navigator.clipboard.writeText(permanentUrl)}><Copy size={15}/>Copy URL</button><button className="btn-secondary" onClick={share}><Share2 size={15}/>Share</button><a className="btn-primary" href={`popwamtap://write-tag/${cardId}`}><Smartphone size={15}/>Open app / Write NFC</a><a className="btn-secondary" href={`popwamtap://test-tag/${cardId}`}><ExternalLink size={15}/>Open app / Test tag</a><a className="btn-secondary" href={`popwamtap://hce/${cardId}`}><RadioTower size={15}/>Use with Android HCE</a><button className="btn-danger" type="button" onClick={lockTag}><LockKeyhole size={15}/>Lock tag read-only</button>{webNfc && <button className="btn-secondary sm:col-span-2" onClick={writeWebNfc}>Experimental Android Web NFC helper</button>}<p className="text-xs text-slate-500 sm:col-span-2">{webNfc ? "Web NFC is experimental. Verify the exact URL before any irreversible lock." : `${nativeNfcInstructions(isIOS)} Normal iPhone websites cannot write NFC tags. iPhone does not provide generic contact-sharing HCE.`}</p>{status && <p className="text-xs text-brand-300 sm:col-span-2">{status}</p>}</div>;
}
