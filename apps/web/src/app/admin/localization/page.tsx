import { redirect } from "next/navigation";

export default function LegacyLocalizationPage() {
  redirect("/admin/translations");
}
