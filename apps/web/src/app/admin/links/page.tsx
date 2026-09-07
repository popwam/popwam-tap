import { redirect } from "next/navigation";

export default async function AdminLinksByUserPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const { user } = await searchParams;
  redirect(user ? `/admin/users/${encodeURIComponent(user)}?tab=links` : "/admin/users");
}

