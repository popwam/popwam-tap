import Link from "next/link";
import { getI18n } from "@/lib/i18n";

export default async function MenuPage() {
  const { dictionary } = await getI18n();
  const c = dictionary.settingsCenter;
  const groups = [
    [c.social, [["/dashboard/friends", c.friends], ["/dashboard/nearby", c.nearby], ["/dashboard/chats", c.messages]]],
    [c.security, [["/dashboard/settings/passkeys", c.nav.passkeys], ["/dashboard/settings/devices", c.nav.devices], ["/dashboard/settings/sessions", c.nav.sessions]]],
    [c.preferences, [["/dashboard/settings/appearance", c.nav.appearance], ["/dashboard/settings/notifications", c.nav.notifications], ["/dashboard/settings/privacy", c.nav.privacy], ["/dashboard/settings/permissions", c.nav.permissions]]],
    [c.profileAndIntegrations, [["/dashboard/integrations", c.connectedAccounts], ["/dashboard/templates", c.templates]]],
    [c.account, [["/dashboard/plans", c.plan], ["/dashboard/settings/account", c.nav.account], ["/dashboard/settings/help", c.nav.help], ["/dashboard/settings/legal", c.nav.legal]]],
  ] as const;
  return <div>
    <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-400">{c.menu}</p>
    <h1 className="mt-2 text-3xl font-black">{c.menuTitle}</h1>
    <p className="mt-2 text-slate-400">{c.menuHelp}</p>
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      {groups.map(([title, items]) => <section className="card overflow-hidden" key={title}><h2 className="border-b border-white/[.06] px-5 py-4 font-black">{title}</h2><nav className="divide-y divide-white/[.06]">{items.map(([href, label]) => <Link className="flex min-h-14 items-center justify-between px-5 py-4 font-semibold hover:bg-white/[.04]" href={href} key={href}><span>{label}</span><span className="directional-icon" aria-hidden>→</span></Link>)}</nav></section>)}
    </div>
  </div>;
}
