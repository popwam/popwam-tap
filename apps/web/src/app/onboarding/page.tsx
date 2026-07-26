import { redirect } from "next/navigation";
import { DynamicOnboardingClient, type DynamicOnboardingState } from "@/components/dynamic-onboarding-client";
import { getCurrentDynamicOnboarding } from "@/lib/dynamic-onboarding";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export default async function DynamicOnboardingPage() {
  const [user, { locale }] = await Promise.all([requireUser(), getI18n()]);
  const current = await getCurrentDynamicOnboarding(user.id, locale);
  if (current.state === "BYPASSED" || current.state === "ONBOARDING_COMPLETE") redirect("/dashboard");
  if (current.state === "BOOTSTRAP_REQUIRED") redirect("/onboarding/start");
  return <DynamicOnboardingClient locale={locale} initial={current as DynamicOnboardingState}/>;
}
