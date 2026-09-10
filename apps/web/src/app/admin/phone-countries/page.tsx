import { redirect } from "next/navigation";

export default function LegacyPhoneCountriesPage() {
  redirect("/admin/countries");
}
