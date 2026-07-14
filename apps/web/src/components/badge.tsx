const styles: Record<string, string> = {
  ACTIVE: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  PROFILE: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  REDIRECT: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  PAUSED: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  LOST: "border-red-400/20 bg-red-400/10 text-red-300",
  DISABLED: "border-slate-400/20 bg-slate-400/10 text-slate-300",
  ADMIN: "border-brand-400/20 bg-brand-400/10 text-brand-300",
  SUPER_ADMIN: "border-brand-400/20 bg-brand-400/10 text-brand-300",
};

export function Badge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide ${styles[value] || "border-white/10 bg-white/5 text-slate-300"}`}>{value.replaceAll("_", " ")}</span>;
}
