"use client";

export function ConfirmSubmit({ children, message, className = "btn-danger", name, value }: { children: React.ReactNode; message: string; className?: string;name?:string;value?:string }) {
  return <button type="submit" name={name} value={value} className={className} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</button>;
}
