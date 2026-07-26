"use client";

import { useState } from "react";
import { StepUpDialog, type StepUpCopy } from "@/components/step-up-dialog";

export function ProductLostButton({
  cardId,
  locale,
  stepUpCopy,
  label,
  confirmText,
  successText,
  failureText,
}: {
  cardId: string;
  locale: "ar" | "en";
  stepUpCopy: StepUpCopy;
  label: string;
  confirmText: string;
  successText: string;
  failureText: string;
}) {
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");

  return <>
    <button type="button" className="btn-danger" onClick={() => {
      if (window.confirm(confirmText)) setVerifying(true);
    }}>{label}</button>
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
    {verifying && <StepUpDialog
      open
      purpose="PRODUCT_LOST"
      locale={locale}
      copy={stepUpCopy}
      onClose={() => setVerifying(false)}
      onVerified={async grant => {
        const response = await fetch(`/api/security/products/${encodeURIComponent(cardId)}/lost`, {
          method: "POST",
          headers: { "x-pop-step-up": grant },
        });
        if (!response.ok) {
          setMessage(failureText);
          throw new Error("PRODUCT_LOST_FAILED");
        }
        setMessage(successText);
        window.location.reload();
      }}
    />}
  </>;
}
