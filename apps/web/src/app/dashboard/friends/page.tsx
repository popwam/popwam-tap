import { FriendsCenter } from "@/components/friends-center";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireUser();
  const requestedTab = (await searchParams).tab;
  const initialTab = requestedTab === "requests" || requestedTab === "search" || requestedTab === "privacy" || requestedTab === "blocked" ? requestedTab : "friends";
  const { locale, dictionary } = await getI18n();
  return <FriendsCenter locale={locale} copy={dictionary.friendsCenter} initialTab={initialTab}/>;
}
