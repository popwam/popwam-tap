"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return <button type="button" className="btn-secondary print:hidden" onClick={() => window.print()}><Printer size={16}/>{label}</button>;
}
