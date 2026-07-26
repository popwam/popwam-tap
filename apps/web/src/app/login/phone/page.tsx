import { redirect } from "next/navigation";

export default async function PhoneLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const callbackUrl = (await searchParams).callbackUrl;
  redirect(callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login");
}
