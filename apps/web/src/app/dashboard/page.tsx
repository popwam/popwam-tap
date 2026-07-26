import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { ProfileHomeEditor } from "@/components/profile-home-editor";

export const metadata = { title: "POP Home" };
export default async function DashboardPage() {
  await requireUser();
  const { locale, dictionary } = await getI18n();
  return <ProfileHomeEditor locale={locale} copy={dictionary.homeEditor}/>;
}
