import { SettingsCenter } from "@/components/settings-center";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  await requireUser();
  const { locale, dictionary } = await getI18n();
  return <SettingsCenter section="root" locale={locale} copy={dictionary.settingsCenter}/>;
}
