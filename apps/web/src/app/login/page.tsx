import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Sign in" };
export default async function LoginPage() {
  const session = await getServerSession(authOptions); if (session?.user) redirect("/dashboard");
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET); const { locale, dictionary } = await getI18n();
  return <main className="flex min-h-screen items-center justify-center px-4 py-12"><Suspense><LoginForm googleEnabled={googleEnabled} locale={locale} copy={dictionary.auth}/></Suspense></main>;
}
