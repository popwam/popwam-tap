import { redirect } from "next/navigation";

export default function LegacyQuotaRequestsPage() {
  redirect("/admin/requests?type=limit");
}
