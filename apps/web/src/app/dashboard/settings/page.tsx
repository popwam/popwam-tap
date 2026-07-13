import { getI18n } from "@/lib/i18n";
import { PageHeading } from "@/components/page-heading";
import { PwaClient } from "@/components/pwa-client";
export default async function SettingsPage(){const {dictionary:d}=await getI18n();return <><PageHeading eyebrow="Settings" title={d.nav.settings} description="Install the secure dashboard and monitor connection status."/><PwaClient mode="settings" installLabel={d.pwa.install}/><div className="card mt-5 p-5"><h2 className="font-bold">Privacy and offline behavior</h2><p className="mt-2 text-sm leading-6 text-slate-400">Private dashboard, admin and API responses are never stored by the service worker. Authentication remains controlled by the browser session policy.</p></div></>;}
