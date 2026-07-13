import { requireUser } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { getI18n } from "@/lib/i18n";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { locale, dictionary } = await getI18n();
  return <DashboardShell user={user} locale={locale} labels={dictionary.nav} languageLabel={dictionary.common.language}>{children}</DashboardShell>;
}
