import { redirect } from "next/navigation";

export default function LegacyFeatureRequestsPage() {
  redirect("/admin/requests?type=feature");
}
