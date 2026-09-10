import { redirect } from "next/navigation";

export default function LegacySubscriptionRequestsPage() {
  redirect("/admin/requests?type=subscription");
}
