import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { PhoneEntryScreen } from "@/components/phone-entry-screen";
import { prisma } from "@popwam/db";
import { isAdminRole } from "@/lib/admin-access";

export const metadata = { title: "POP" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const requested = (await searchParams).callbackUrl;
    const account = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, status: true } });
    if (account?.status === "ACTIVE" && requested?.startsWith("/admin") && isAdminRole(account.role)) redirect("/admin");
    redirect("/dashboard");
  }
  const [{ locale }, params] = await Promise.all([getI18n(), searchParams]);
  const callbackUrl = params.callbackUrl?.startsWith("/") && !params.callbackUrl.startsWith("//") ? params.callbackUrl : "/dashboard";
  return <PhoneEntryScreen locale={locale} callbackUrl={callbackUrl}/>;
}
