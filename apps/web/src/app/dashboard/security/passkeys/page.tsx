import { redirect } from "next/navigation";

export default function LegacyPasskeysPage() {
  redirect("/dashboard/settings/passkeys");
}
