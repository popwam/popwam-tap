"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CreditCard, Gauge, LogOut, Nfc, Shield, UserRound } from "lucide-react";

const links = [
  ["/dashboard", "Overview", Gauge],
  ["/dashboard/profile", "Profile", UserRound],
  ["/dashboard/cards", "Destinations", CreditCard],
  ["/dashboard/tags", "Smart tags", Nfc],
] as const;

export function DashboardShell({ children, user }: { children: React.ReactNode; user: { name?: string | null; email?: string | null; role: string } }) {
  const pathname = usePathname();
  return <div className="mx-auto min-h-screen max-w-[1500px] lg:grid lg:grid-cols-[250px_1fr]">
    <aside className="border-b border-white/10 bg-black/20 p-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-6">
      <div className="flex items-center justify-between lg:block"><Link href="/" className="text-lg font-black"><span className="text-brand-400">POPWAM</span> Tap</Link><button onClick={() => signOut({ callbackUrl: "/login" })} className="text-slate-500 lg:hidden"><LogOut size={19}/></button></div>
      <nav className="mt-5 flex gap-2 overflow-x-auto lg:mt-10 lg:block lg:space-y-1">
        {links.map(([href, label, Icon]) => { const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-brand-500/10 text-brand-400" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon size={17}/>{label}</Link>; })}
        {user.role === "ADMIN" && <Link href="/admin" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${pathname.startsWith("/admin") ? "bg-brand-500/10 text-brand-400" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Shield size={17}/>Admin</Link>}
      </nav>
      <div className="mt-10 hidden border-t border-white/10 pt-5 lg:block"><p className="truncate text-sm font-semibold">{user.name || "POPWAM user"}</p><p className="mt-1 truncate text-xs text-slate-500">{user.email}</p><button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-4 flex items-center gap-2 text-xs text-slate-500 hover:text-white"><LogOut size={14}/> Sign out</button></div>
    </aside>
    <main className="min-w-0 p-4 sm:p-7 lg:p-10">{children}</main>
  </div>;
}
