"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, CreditCard, Gauge, Heart, Languages, Layers3, Lightbulb, Link2, LogOut, MessageCircle, MessageSquareText, Nfc, Package, Palette, ScrollText, Settings, Shield, ShoppingBag, UserRound, Users, WalletCards } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ProfileAvatar } from "@/components/profile-avatar";

type NavCopy = { overview:string; profile:string; destinations:string; tags:string; uploads:string; admin:string; signOut:string; users:string; organizations:string; plans:string; limits:string; profiles:string; links:string; themes:string; settings:string; audit:string;home:string;myProfiles:string;imageEditor:string;myLinks:string;myFiles:string;myCards:string;appearance:string;cardsBatches:string;inventory:string;suppliers:string;purchases:string;expenses:string;customers:string;orders:string;branding:string;sms:string;userDashboard:string };
export function DashboardShell({ children,user,locale,labels,languageLabel }: { children:React.ReactNode; user:{ name?:string|null;email?:string|null;image?:string|null;role:string };locale:"ar"|"en";labels:NavCopy;languageLabel:string }) {
  const pathname=usePathname(); const admin=pathname.startsWith("/admin"); const canAdmin=user.role==="ADMIN"||user.role==="SUPER_ADMIN";
  const userLinks=[
    ["/dashboard",labels.home,Gauge],
    ["/dashboard/share",locale==="ar"?"مشاركة":"Share",Link2],
    ["/dashboard/menu",locale==="ar"?"القائمة":"Menu",Settings],
  ] as const;
  const adminLinks=[
    ["/admin",labels.overview,Gauge],
    ["/admin/store",locale==="ar"?"متجر POP":"POP Store",ShoppingBag],
    ["/admin/inventory",labels.inventory,Package],
    ["/admin/cards/batches",locale==="ar"?"دفعات الإنتاج":"Production batches",Nfc],
    ["/admin/cards",locale==="ar"?"الكروت الفعلية":"Physical cards",Nfc],
    ["/admin/cards/unassigned",locale==="ar"?"كروت غير معيّنة":"Unassigned cards",Nfc],
    ["/admin/users",labels.users,Users],
    ["/admin/security",locale==="ar"?"الأجهزة والجلسات":"Devices & sessions",Shield],
    ["/admin/customers",labels.customers,Users],
    ["/admin/subscriptions",locale==="ar"?"طلبات الاشتراك":"Subscription requests",Layers3],
    ["/admin/quota-requests",locale==="ar"?"طلبات زيادة الحدود":"Quota requests",Gauge],
    ["/admin/orders",labels.orders,WalletCards],
    ["/admin/inventory/items",locale==="ar"?"المنتجات":"Products",ShoppingBag],
    ["/admin/profiles",locale==="ar"?"الملفات الافتراضية":"Virtual profiles",UserRound],
    ["/admin/link-platforms",locale==="ar"?"منصات الروابط":"Link platforms",Link2],
    ["/admin/integrations",locale==="ar"?"التكاملات":"Integrations",Link2],
    ["/admin/links",locale==="ar"?"الروابط حسب المستخدم":"Links by user",Link2],
    ["/admin/templates",locale==="ar"?"القوالب":"Templates",Palette],
    ["/admin/plans",labels.plans,Layers3],
    ["/admin/notifications",locale==="ar"?"مركز الإشعارات":"Notifications center",Bell],
    ["/admin/localization",locale==="ar"?"اللغات والترجمة":"Languages",Languages],
    ["/admin/wallet",locale==="ar"?"إعداد المحفظة":"Wallet setup",WalletCards],
    ["/admin/transfers",locale==="ar"?"عمليات النقل":"Transfers",CreditCard],
    ["/admin/feature-requests",locale==="ar"?"طلبات الميزات":"Feature requests",Lightbulb],
    ["/admin/reports",locale==="ar"?"البلاغات والنزاعات":"Reports & disputes",MessageCircle],
    ["/admin/audit",labels.audit,ScrollText],
  ] as const;
  const platformLinks=[
    ["/admin/localization","Languages & translations",Languages],
    ["/admin/phone-countries","Phone countries",Settings],
    ["/admin/legal","Legal & agreements",ScrollText],
    ["/admin/platform-readiness","Platform readiness",Gauge],
  ] as const;
  const links=admin?[...adminLinks,...platformLinks,["/admin/sms",labels.sms,MessageSquareText] as const]:userLinks;
  const logoutUrl=admin?"/admin/login":"/login";
  return <div className="mx-auto min-h-screen max-w-[1600px] lg:grid lg:grid-cols-[270px_1fr]"><aside className="border-b border-white/10 bg-black/20 p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-e lg:p-6"><div className="flex items-center justify-between"><Link href="/" className="text-lg font-black"><span className="text-brand-400">POP</span> by POPWAM</Link><button onClick={()=>signOut({callbackUrl:logoutUrl})} className="text-slate-500 lg:hidden" aria-label={labels.signOut}><LogOut size={19}/></button></div><nav className="mt-5 flex gap-2 overflow-x-auto lg:mt-8 lg:block lg:space-y-1">{links.map(([href,label,Icon])=>{const active=href===(admin?"/admin":"/dashboard")?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active?"bg-brand-500/10 text-brand-400":"text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon size={17}/>{label}</Link>;})}{!admin&&user.role==="ADMIN"&&<Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"><Shield size={17}/>{labels.admin}</Link>}{admin&&<Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"><Gauge size={17}/>{locale==="ar"?"لوحة المستخدم":"User dashboard"}</Link>}</nav><div className="mt-8 hidden border-t border-white/10 pt-5 lg:block"><div className="flex items-center gap-3"><ProfileAvatar name={user.name} email={user.email} imageUrl={user.image} size={40}/><div className="min-w-0"><p className="truncate text-sm font-semibold">{user.name||"POPWAM"}</p><p className="truncate text-xs text-slate-500" dir="ltr">{user.email}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><LocaleSwitcher locale={locale} label={languageLabel}/><button onClick={()=>signOut({callbackUrl:logoutUrl})} className="btn-secondary"><LogOut size={14}/>{labels.signOut}</button>{!admin&&<Link href="/dashboard/settings/sessions" className="btn-secondary"><Shield size={14}/>{locale==="ar"?"الجلسات":"Sessions"}</Link>}</div><p className="mt-3 text-xs text-slate-600">POP by POPWAM · 0.0.12</p></div></aside><main className="min-w-0 p-4 sm:p-7 lg:p-10">{children}</main></div>;
}
