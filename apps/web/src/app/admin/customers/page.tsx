import { redirect } from "next/navigation";

export default function CustomersPage() {
  redirect("/admin/users?customer=1");
}

