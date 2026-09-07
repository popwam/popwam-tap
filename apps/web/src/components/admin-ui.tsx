import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/badge";
import { ProfileAvatar } from "@/components/profile-avatar";

export function DashboardPageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="admin-page-header">
    <div className="min-w-0">
      {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>;
}

export function MetricCard({ title, value, note, icon: Icon, emphasis = false }: { title: string; value: string | number; note?: string; icon: LucideIcon; emphasis?: boolean }) {
  return <article className={`admin-metric ${emphasis ? "admin-metric-emphasis" : ""}`}>
    <div className="admin-metric-icon"><Icon size={19}/></div>
    <div>
      <p className="admin-metric-label">{title}</p>
      <strong>{value}</strong>
      {note && <p className="admin-metric-note">{note}</p>}
    </div>
  </article>;
}

export function QuickActionCard({ href, title, description, icon: Icon }: { href: string; title: string; description?: string; icon: LucideIcon }) {
  return <Link href={href} className="admin-quick-action">
    <span><Icon size={20}/></span>
    <div className="min-w-0 flex-1"><strong>{title}</strong>{description && <p>{description}</p>}</div>
    <ArrowUpRight className="directional-icon shrink-0 opacity-45" size={17}/>
  </Link>;
}

export function StatusBadge({ value }: { value: string }) {
  return <Badge value={value}/>;
}

export function UserIdentityCell({ name, email, imageUrl }: { name?: string | null; email?: string | null; imageUrl?: string | null }) {
  return <div className="flex min-w-0 items-center gap-3">
    <ProfileAvatar name={name} email={email} imageUrl={imageUrl} size={42}/>
    <div className="min-w-0"><p className="truncate font-bold text-[color:var(--app-text)]">{name || email || "POP user"}</p>{email && <p className="truncate text-xs text-slate-500" dir="ltr">{email}</p>}</div>
  </div>;
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="admin-filter-bar"><SlidersHorizontal size={18} className="text-brand-400"/>{children}</div>;
}

export function SearchField({ name = "q", defaultValue, placeholder }: { name?: string; defaultValue?: string; placeholder: string }) {
  return <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" size={17}/><input className="input ps-10" type="search" name={name} defaultValue={defaultValue} placeholder={placeholder}/></label>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="admin-empty-state"><div className="admin-empty-mark">POP</div><h3>{title}</h3>{description && <p>{description}</p>}</div>;
}

export function AdminDataTable({ children, minWidth = 900 }: { children: React.ReactNode; minWidth?: number }) {
  return <div className="admin-table-shell"><div className="overflow-x-auto"><table className="admin-data-table" style={{ minWidth }}>{children}</table></div></div>;
}
