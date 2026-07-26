import { NearbyCenter } from "@/components/nearby-center";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export default async function NearbyPage() {
  await requireUser();
  const { locale, dictionary } = await getI18n();
  return <NearbyCenter locale={locale} copy={dictionary.nearbyCenter}/>;
}
