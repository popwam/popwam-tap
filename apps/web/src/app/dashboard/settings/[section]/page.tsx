import { notFound } from "next/navigation";
import { SettingsCenter } from "@/components/settings-center";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

const sections = new Set(["appearance", "notifications", "privacy", "permissions", "security", "devices", "sessions", "passkeys", "account", "help", "legal"]);

export default async function SettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  await requireUser();
  const { section } = await params;
  if (!sections.has(section)) notFound();
  const { locale, dictionary } = await getI18n();
  return <SettingsCenter section={section as never} locale={locale} copy={dictionary.settingsCenter}/>;
}
