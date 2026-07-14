import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { LoginForm } from "@/components/login-form";
import { prisma } from "@popwam/db";
import { isAdminRole } from "@/lib/admin-access";

export const metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const requested = (await searchParams).callbackUrl;
    const account = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, status: true } });
    if (account?.status === "ACTIVE" && requested?.startsWith("/admin") && isAdminRole(account.role)) redirect("/admin");
    redirect("/dashboard");
  }
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET); const { locale, dictionary } = await getI18n();
  return <main className="flex min-h-screen items-center justify-center px-4 py-12"><Suspense><LoginForm googleEnabled={googleEnabled} locale={locale} copy={dictionary.auth}/></Suspense></main>;
}
