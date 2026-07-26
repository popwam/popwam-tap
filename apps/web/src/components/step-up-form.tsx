"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { StepUpDialog, type StepUpCopy, type StepUpPurpose } from "@/components/step-up-dialog";

export function StepUpForm({
  action,
  purpose,
  locale,
  copy,
  className,
  children,
}: {
  action: (data: FormData) => void | Promise<void>;
  purpose: StepUpPurpose;
  locale: "ar" | "en";
  copy: StepUpCopy;
  className?: string;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [verifying, setVerifying] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    if (new FormData(form).get("stepUpGrant")) return;
    event.preventDefault();
    if (form.reportValidity()) setVerifying(true);
  }

  return <>
    <form ref={formRef} action={action} className={className} onSubmit={submit}>{children}</form>
    {verifying && <StepUpDialog
      open
      purpose={purpose}
      locale={locale}
      copy={copy}
      onClose={() => setVerifying(false)}
      onVerified={grant => {
        const form = formRef.current;
        if (!form) return;
        let input = form.elements.namedItem("stepUpGrant") as HTMLInputElement | null;
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = "stepUpGrant";
          form.appendChild(input);
        }
        input.value = grant;
        form.requestSubmit();
      }}
    />}
  </>;
}
