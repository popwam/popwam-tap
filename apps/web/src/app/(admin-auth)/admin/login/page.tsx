import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { forbidden, redirect } from "next/navigation";
import { prisma } from "@popwam/db";
import { authOptions } from "@/lib/auth";
import { decideAdminAccess } from "@/lib/admin-access";
import { getI18n } from "@/lib/i18n";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata = { title: "Admin Portal" };

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const account = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, status: true } });
    const decision = decideAdminAccess(account);
    if (decision === "ALLOWED") redirect("/admin");
    forbidden();
  }
  const { locale, dictionary } = await getI18n();
  return <main className="landing-shell flex min-h-screen items-center justify-center px-4 py-12"><Suspense><AdminLoginForm locale={locale} copy={dictionary.adminAuth} languageLabel={dictionary.common.language}/></Suspense></main>;
}
