import { ShareCenter } from "@/components/share-center";
import { getI18n } from "@/lib/i18n";

export default async function SharePage() {
  const { locale, dictionary } = await getI18n();
  const copy = (dictionary as typeof dictionary & { shareCenter: Record<string, string> }).shareCenter;
  return <ShareCenter locale={locale} copy={copy}/>;
}
