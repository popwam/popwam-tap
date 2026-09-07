"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, Boxes, ClipboardList, FileText, Gauge, Languages, Layers3, Link2, LogOut, MessageCircle, MessageSquareText, Nfc, Package, ScrollText, Settings, ShieldCheck, Users } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ProfileAvatar } from "@/components/profile-avatar";

type NavCopy = { overview:string; profile:string; destinations:string; tags:string; uploads:string; admin:string; signOut:string; users:string; organizations:string; plans:string; limits:string; profiles:string; links:string; themes:string; settings:string; audit:string;home:string;myProfiles:string;imageEditor:string;myLinks:string;myFiles:string;myCards:string;appearance:string;cardsBatches:string;inventory:string;suppliers:string;purchases:string;expenses:string;customers:string;orders:string;branding:string;sms:string;userDashboard:string };

export function DashboardShell({ children,user,locale,labels,languageLabel }: { children:React.ReactNode; user:{ name?:string|null;email?:string|null;image?:string|null;role:string };locale:"ar"|"en";labels:NavCopy;languageLabel:string }) {
  const pathname=usePathname();
  const admin=pathname.startsWith("/admin");
  const userLinks=[
    ["/dashboard",labels.home,Gauge],
    ["/dashboard/share",locale==="ar"?"مشاركة":"Share",Link2],
    ["/dashboard/menu",locale==="ar"?"القائمة":"Menu",Settings],
  ] as const;
  const adminLinks=[
    ["/admin",locale==="ar"?"نظرة عامة":"Overview",Gauge],
    ["/admin/users",locale==="ar"?"المستخدمون":"Users",Users],
    ["/admin/inventory",locale==="ar"?"المخزون":"Inventory",Package],
    ["/admin/cards/batches",locale==="ar"?"دفعات الإنتاج":"Production batches",Boxes],
    ["/admin/cards",locale==="ar"?"كروت POP":"POP cards",Nfc],
    ["/admin/requests",locale==="ar"?"الطلبات":"Requests",ClipboardList],
    ["/admin/link-platforms",locale==="ar"?"منصات الروابط":"Link platforms",Link2],
    ["/admin/plans",locale==="ar"?"الباقات":"Plans",Layers3],
    ["/admin/notifications",locale==="ar"?"الإشعارات":"Notifications",Bell],
    ["/admin/localization",locale==="ar"?"اللغات والترجمة":"Languages & translations",Languages],
    ["/admin/reports",locale==="ar"?"البلاغات والنزاعات":"Reports & disputes",MessageCircle],
    ["/admin/audit",locale==="ar"?"سجل التدقيق":"Audit log",ScrollText],
    ["/admin/phone-countries",locale==="ar"?"الدول":"Countries",Settings],
    ["/admin/legal",locale==="ar"?"الاتفاقيات والسياسات":"Agreements & policies",FileText],
    ["/admin/platform-readiness",locale==="ar"?"حالة المنصة":"Platform status",ShieldCheck],
    ["/admin/sms",locale==="ar"?"إعدادات الرسائل":"SMS settings",MessageSquareText],
  ] as const;
  const links=admin?adminLinks:userLinks;
  const logoutUrl=admin?"/admin/login":"/login";
  return <div className={`${admin?"admin-shell":""} mx-auto min-h-screen max-w-[1720px] lg:grid lg:grid-cols-[244px_minmax(0,1fr)]`}>
    <aside className={`${admin?"admin-sidebar":"border-white/10 bg-black/20"} border-b p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-e lg:p-5`}>
      <div className="flex items-center justify-between gap-3">
        <Link href={admin?"/admin":"/"} className="flex items-center gap-3"><span className="admin-brand-mark">POP</span><span><b className="block text-sm font-black">POP by POPWAM</b>{admin&&<small className="block text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Admin space</small>}</span></Link>
        <button onClick={()=>signOut({callbackUrl:logoutUrl})} className="text-slate-500 lg:hidden" aria-label={labels.signOut}><LogOut size={19}/></button>
      </div>
      <nav className={`mt-5 flex gap-2 overflow-x-auto lg:mt-7 lg:block ${admin?"lg:space-y-0.5":"lg:space-y-1"}`} aria-label={admin?"Admin navigation":"Dashboard navigation"}>
        {links.map(([href,label,Icon])=>{const active=href===(admin?"/admin":"/dashboard")?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} className={admin?"admin-nav-link":"flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"} data-active={admin?active:undefined}><Icon size={17}/>{label}</Link>;})}
        {!admin&&user.role==="ADMIN"&&<Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"><ShieldCheck size={17}/>{labels.admin}</Link>}
        {admin&&<Link href="/dashboard" className="admin-nav-link mt-3 border-t border-white/10 pt-4"><Gauge size={17}/>{locale==="ar"?"لوحة المستخدم":"User dashboard"}</Link>}
      </nav>
      <div className="mt-7 hidden border-t border-white/10 pt-5 lg:block">
        <div className="flex items-center gap-3"><ProfileAvatar name={user.name} email={user.email} imageUrl={user.image} size={38}/><div className="min-w-0"><p className="truncate text-sm font-bold">{user.name||"POPWAM"}</p><p className="truncate text-[11px] text-slate-500" dir="ltr">{user.email}</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2"><LocaleSwitcher locale={locale} label={languageLabel}/><button onClick={()=>signOut({callbackUrl:logoutUrl})} className="btn-secondary"><LogOut size={14}/>{labels.signOut}</button></div>
        <p className="mt-4 text-[10px] font-semibold text-slate-600">POP by POPWAM · 0.0.12</p>
      </div>
    </aside>
    <main className="min-w-0 p-4 sm:p-7 lg:p-8 xl:p-10">{children}</main>
  </div>;
}
