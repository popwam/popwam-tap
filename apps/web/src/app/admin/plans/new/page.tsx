import { getI18n } from "@/lib/i18n";
import { PageHeading } from "@/components/page-heading";
import { PlanForm } from "@/components/plan-form";
import { DEFAULT_PROFILE_OPEN_POLICY } from "@/lib/plan-open-policy";
export default async function NewPlanPage(){const {locale}=await getI18n();return <><PageHeading eyebrow={locale==="ar"?"الباقات":"Plans"} title={locale==="ar"?"إنشاء باقة":"Create plan"} description={locale==="ar"?"عرّف الهوية والحدود والميزات والاستحقاقات بوضوح.":"Define identity, limits, features, and entitlements in focused groups."}/><PlanForm locale={locale} openPolicy={DEFAULT_PROFILE_OPEN_POLICY}/></>;}
